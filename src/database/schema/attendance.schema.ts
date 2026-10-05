import { sql } from 'drizzle-orm';
import {
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  unique,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { employees } from './employees.schema.js';
import { users } from './user.schema.js';
import { timestamps } from './common.schema.js';

export const attendanceRecords = pgTable(
  'attendance_records',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    employeeId: integer('employee_id')
      .references(() => employees.id)
      .notNull(),
    workDate: date('work_date').notNull(),
    checkInAt: timestamp('check_in_at', {
      withTimezone: true,
      mode: 'date',
    }).notNull(),
    checkOutAt: timestamp('check_out_at', {
      withTimezone: true,
      mode: 'date',
    }),
    ...timestamps,
  },
  (t) => [
    unique('attendance_employee_date_uq').on(t.employeeId, t.workDate),
    index('attendance_work_date_idx').on(t.workDate),
  ],
);

export type AttendanceRecord = typeof attendanceRecords.$inferSelect;

export const attendanceCorrectionStatusEnum = pgEnum(
  'attendance_correction_status',
  ['pending', 'approved', 'rejected', 'cancelled'],
);

/**
 * Employee requests to fix a day's check-in/out (forgotten check-out,
 * missed check-in). Approval writes the times onto attendance_records;
 * the request row stays as the audit trail.
 */
export const attendanceCorrections = pgTable(
  'attendance_corrections',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    employeeId: integer('employee_id')
      .references(() => employees.id)
      .notNull(),
    workDate: date('work_date').notNull(),
    /** null = keep the recorded time. */
    checkInAt: timestamp('check_in_at', { withTimezone: true, mode: 'date' }),
    checkOutAt: timestamp('check_out_at', {
      withTimezone: true,
      mode: 'date',
    }),
    reason: varchar('reason', { length: 255 }).notNull(),
    status: attendanceCorrectionStatusEnum('status')
      .default('pending')
      .notNull(),
    reviewedBy: integer('reviewed_by').references(() => users.id),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true, mode: 'date' }),
    ...timestamps,
  },
  (t) => [
    // One open request per employee and day.
    uniqueIndex('attendance_corrections_pending_uq')
      .on(t.employeeId, t.workDate)
      .where(sql`${t.status} = 'pending'`),
  ],
);

export type AttendanceCorrection = typeof attendanceCorrections.$inferSelect;
export type NewAttendanceCorrection = typeof attendanceCorrections.$inferInsert;
