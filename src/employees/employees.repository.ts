import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE_ORM } from '../database/database.constants.js';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema/index.js';
import { employees } from '../database/schema/employees.schema.js';
import { users } from '../database/schema/user.schema.js';
import { departments } from '../database/schema/departments.schema.js';
import { eq, sql } from 'drizzle-orm';
import { Employee, NewEmployee } from '../database/schema/employees.schema.js';

export interface ReportRow {
  id: number;
  userId: number;
  managerId: number | null;
  departmentId: number;
  jobTitle: string;
  depth: number;
  [key: string]: unknown;
}

export interface UpcomingBirthdayRow {
  employeeId: number;
  firstName: string;
  lastName: string;
  jobTitle: string;
  departmentId: number;
  departmentName: string;
  birthday: string;
  nextBirthday: string;
  daysUntil: number;
  [key: string]: unknown;
}

@Injectable()
export class EmployeesRepository {
  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async create(data: NewEmployee): Promise<Employee> {
    const [employee] = await this.db.insert(employees).values(data).returning();
    return employee;
  }

  async findAll(): Promise<Employee[]> {
    return this.db.select().from(employees);
  }

  async findById(id: number): Promise<Employee | undefined> {
    return this.db.query.employees.findFirst({ where: eq(employees.id, id) });
  }

  async findByUserId(userId: number): Promise<Employee | undefined> {
    return this.db.query.employees.findFirst({
      where: eq(employees.userId, userId),
    });
  }

  async update(
    id: number,
    data: Partial<typeof employees.$inferInsert>,
  ): Promise<Employee | undefined> {
    const [employee] = await this.db
      .update(employees)
      .set(data)
      .where(eq(employees.id, id))
      .returning();

    return employee;
  }

  async remove(id: number): Promise<void> {
    await this.db.delete(employees).where(eq(employees.id, id));
  }

  async findReports(managerId: number): Promise<ReportRow[]> {
    const result = await this.db.execute<ReportRow>(sql`
      WITH RECURSIVE reports AS (
        SELECT
          ${employees.id},
          ${employees.userId} AS "userId",
          ${employees.managerId} AS "managerId",
          ${employees.departmentId} AS "departmentId",
          ${employees.jobTitle} AS "jobTitle",
          1 AS depth
        FROM ${employees}
        WHERE ${employees.managerId} = ${managerId}

        UNION ALL

        SELECT
          e.id,
          e.user_id AS "userId",
          e.manager_id AS "managerId",
          e.department_id AS "departmentId",
          e.job_title AS "jobTitle",
          r.depth + 1
        FROM ${employees} e
        JOIN reports r ON e.manager_id = r.id
      )
      SELECT * FROM reports ORDER BY depth, id
    `);
    return result.rows;
  }

  /**
   * Employees whose next birthday falls within `days` of `today`
   * (YYYY-MM-DD). Adding whole years to the birth date maps Feb 29 to
   * Feb 28 in non-leap years.
   */
  async findUpcomingBirthdays(
    today: string,
    days: number,
    excludedStatuses: readonly string[],
  ): Promise<UpcomingBirthdayRow[]> {
    const result = await this.db.execute<UpcomingBirthdayRow>(sql`
      WITH b AS (
        SELECT
          e.id,
          e.date_of_birth AS dob,
          (date_part('year', ${today}::date) - date_part('year', e.date_of_birth))::int AS age
        FROM ${employees} e
        WHERE e.date_of_birth IS NOT NULL
          AND e.status::text NOT IN (${sql.join(
            excludedStatuses.map((s) => sql`${s}`),
            sql`, `,
          )})
      ),
      n AS (
        SELECT
          b.id,
          b.dob,
          CASE
            WHEN (b.dob + make_interval(years => b.age))::date >= ${today}::date
              THEN (b.dob + make_interval(years => b.age))::date
            ELSE (b.dob + make_interval(years => b.age + 1))::date
          END AS next_birthday
        FROM b
      )
      SELECT
        e.id AS "employeeId",
        u.first_name AS "firstName",
        u.last_name AS "lastName",
        e.job_title AS "jobTitle",
        d.id AS "departmentId",
        d.name AS "departmentName",
        to_char(n.dob, 'MM-DD') AS birthday,
        to_char(n.next_birthday, 'YYYY-MM-DD') AS "nextBirthday",
        n.next_birthday - ${today}::date AS "daysUntil"
      FROM n
      JOIN ${employees} e ON e.id = n.id
      JOIN ${users} u ON u.id = e.user_id
      JOIN ${departments} d ON d.id = e.department_id
      WHERE n.next_birthday - ${today}::date <= ${days}
      ORDER BY "daysUntil", u.first_name, u.last_name
    `);
    return result.rows;
  }
}
