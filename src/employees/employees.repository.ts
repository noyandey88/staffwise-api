import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE_ORM } from '../database/database.constants.js';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema/index.js';
import { employees } from '../database/schema/employees.schema.js';
import { eq, sql } from 'drizzle-orm';
import { Employee, NewEmployee } from '../database/schema/employees.schema.js';

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

  async findReports(managerId: number) {
    const result = await this.db.execute(sql`
      WITH RECURSIVE reports AS (
        SELECT id, user_id, manager_id, department_id, job_title, 1 AS depth
        FROM employees
        WHERE manager_id = ${managerId}

        UNION ALL

        SELECT e.id, e.user_id, e.manager_id, e.department_id, e.job_title, r.depth + 1
        FROM employees e
        JOIN reports r ON e.manager_id = r.id
      )
      SELECT * FROM reports ORDER BY depth, id
    `);
    return result.rows;
  }
}
