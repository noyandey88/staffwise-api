import { date, integer, pgEnum, pgTable, varchar } from 'drizzle-orm/pg-core';
import { users } from './user.schema.js';
import { departments } from './departments.schema.js';
import { EmployeeStatus } from '../../employees/employees.enum.js';
import { timestamps } from './common.schema.js';

export const employeesEnum = pgEnum(
  'employee_status',
  Object.values(EmployeeStatus) as [EmployeeStatus, ...EmployeeStatus[]],
);

export const employees = pgTable('employees', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull()
    .unique(),
  departmentId: integer('department_id')
    .references(() => departments.id)
    .notNull(),
  managerId: integer('manager_id').references((): any => employees.id),
  jobTitle: varchar('job_title', { length: 100 }).notNull(),
  status: employeesEnum('status').default(EmployeeStatus.Active).notNull(),
  hiredAt: date('hired_at').notNull(),
  ...timestamps,
});

export type NewEmployee = typeof employees.$inferInsert;
export type Employee = typeof employees.$inferSelect;
