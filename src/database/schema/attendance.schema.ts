import { sql } from 'drizzle-orm';
import {
  boolean,
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
import { offices } from './office.schema.js';

export const workLocationEnum = pgEnum('work_location', ['office', 'remote']);

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
    /** Where they worked; null on records from before work modes. */
    workLocation: workLocationEnum('work_location'),
    /** Office an office check-in was verified against (if verification is on). */
    officeId: integer('office_id').references(() => offices.id),
    /** 'ip' or 'location' when the office check-in was verified. */
    verifiedBy: varchar('verified_by', { length: 10 }),
    /** Remote on an expected office day without approval (policy: flag). */
    outsideArrangement: boolean('outside_arrangement').default(false).notNull(),
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
