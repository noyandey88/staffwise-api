import {
  date,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { employees } from './employees.schema.js';
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
  ...timestamps,
});

export const leaveBalances = pgTable('leave_balances', {
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
});

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
  reviewedBy: integer('reviewed_by').references(() => employees.id),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true, mode: 'date' }),
  ...timestamps,
});

export type LeaveType = typeof leaveTypes.$inferSelect;
export type LeaveBalance = typeof leaveBalances.$inferSelect;
export type LeaveRequest = typeof leaveRequests.$inferSelect;
