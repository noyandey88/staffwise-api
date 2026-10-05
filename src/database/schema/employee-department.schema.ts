import { date, integer, pgTable, uniqueIndex } from 'drizzle-orm/pg-core';
import { employees } from './employees.schema.js';
import { departments } from './departments.schema.js';
import { users } from './user.schema.js';
import { timestamps } from './common.schema.js';

/**
 * Which department an employee belonged to, from a date onward, so
 * date-based rules (work arrangements, shifts) use the department they
 * were in on that day. employees.department_id stays the current one.
 */
export const employeeDepartments = pgTable(
  'employee_departments',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    employeeId: integer('employee_id')
      .references(() => employees.id, { onDelete: 'cascade' })
      .notNull(),
    departmentId: integer('department_id')
      .references(() => departments.id)
      .notNull(),
    effectiveFrom: date('effective_from').notNull(),
    createdBy: integer('created_by').references(() => users.id),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('employee_departments_employee_from_uq').on(
      t.employeeId,
      t.effectiveFrom,
    ),
  ],
);

export type EmployeeDepartment = typeof employeeDepartments.$inferSelect;
