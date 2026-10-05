import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { DRIZZLE_ORM } from '../database/database.constants.js';
import * as schema from '../database/schema/index.js';
import { employees } from '../database/schema/employees.schema.js';
import { users } from '../database/schema/user.schema.js';
import { leaveTypes } from '../database/schema/leave.schema.js';
import { payslips } from '../database/schema/payroll.schema.js';

const managers = alias(employees, 'managers');
const managerUsers = alias(users, 'manager_users');

/** Read-only lookups of who to email. */
@Injectable()
export class NotificationRepository {
  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  /** The employee and their direct manager (null when they have none). */
  async employeeWithManager(employeeId: number) {
    const [row] = await this.db
      .select({
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        managerEmail: managerUsers.email,
        managerFirstName: managerUsers.firstName,
      })
      .from(employees)
      .innerJoin(users, eq(users.id, employees.userId))
      .leftJoin(managers, eq(managers.id, employees.managerId))
      .leftJoin(managerUsers, eq(managerUsers.id, managers.userId))
      .where(eq(employees.id, employeeId));
    return row;
  }

  async leaveTypeName(id: number) {
    const [row] = await this.db
      .select({ name: leaveTypes.name })
      .from(leaveTypes)
      .where(eq(leaveTypes.id, id));
    return row?.name ?? 'leave';
  }

  async payslipRecipients(runId: number) {
    return this.db
      .select({ email: users.email, firstName: users.firstName })
      .from(payslips)
      .innerJoin(employees, eq(employees.id, payslips.employeeId))
      .innerJoin(users, eq(users.id, employees.userId))
      .where(eq(payslips.payrollRunId, runId))
      .orderBy(sql`${users.id}`);
  }
}
