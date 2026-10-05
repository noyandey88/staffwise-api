import {
  boolean,
  date,
  integer,
  pgEnum,
  pgTable,
  uniqueIndex,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { employees } from './employees.schema.js';
import { users } from './user.schema.js';
import { timestamps } from './common.schema.js';

export const leaveStatusEnum = pgEnum('leave_status', [
  'pending',
  'approved',
  'rejected',
  'cancelled',
]);

export const leaveTypes = pgTable('leave_types', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  defaultDaysPerYear: integer('default_days_per_year').notNull(),
  /** Unpaid leave is deducted from salary in payroll runs. */
  isPaid: boolean('is_paid').default(true).notNull(),
  /** Unused days are paid out in a final settlement. */
  isEncashable: boolean('is_encashable').default(false).notNull(),
  ...timestamps,
});

export const leaveBalances = pgTable(
  'leave_balances',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    employeeId: integer('employee_id')
      .references(() => employees.id)
      .notNull(),
    leaveTypeId: integer('leave_type_id')
      .references(() => leaveTypes.id)
      .notNull(),
    year: integer('year').notNull(),
    remainingDays: integer('remaining_days').notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('leave_balances_employee_type_year_idx').on(
      t.employeeId,
      t.leaveTypeId,
      t.year,
    ),
  ],
);

export const leaveRequests = pgTable('leave_requests', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  employeeId: integer('employee_id')
    .references(() => employees.id)
    .notNull(),
  leaveTypeId: integer('leave_type_id')
    .references(() => leaveTypes.id)
    .notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  days: integer('days').notNull(),
  status: leaveStatusEnum('status').default('pending').notNull(),
  reason: varchar('reason', { length: 255 }),
  /** User id, so reviewers without an employee record (super admin) work. */
  reviewedBy: integer('reviewed_by').references(() => users.id),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true, mode: 'date' }),
  ...timestamps,
});

export type LeaveType = typeof leaveTypes.$inferSelect;
export type NewLeaveType = typeof leaveTypes.$inferInsert;
export type LeaveBalance = typeof leaveBalances.$inferSelect;
export type LeaveRequest = typeof leaveRequests.$inferSelect;
