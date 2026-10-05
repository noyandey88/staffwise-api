import {
  check,
  date,
  integer,
  pgTable,
  time,
  varchar,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './user.schema.js';
import { timestamps } from './common.schema.js';

/**
 * Attendance rules from a date onward. The row with the latest
 * effective_from on or before a work date governs that day (lateness and
 * overtime are computed at read time), so a change never rewrites history;
 * the row in force today supplies the timezone for "today" and the
 * correction limits.
 */
export const attendancePolicies = pgTable(
  'attendance_policies',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    effectiveFrom: date('effective_from').notNull().unique(),
    /** IANA name, e.g. "Asia/Dhaka"; defines dates and local times. */
    timezone: varchar('timezone', { length: 64 }).notNull(),
    workStartTime: time('work_start_time').notNull(),
    /** Late when checking in after work start + grace. */
    lateGraceMinutes: integer('late_grace_minutes').notNull(),
    /** Minutes beyond this are overtime. */
    standardWorkMinutes: integer('standard_work_minutes').notNull(),
    /** Corrections may reach this many days before today. */
    correctionWindowDays: integer('correction_window_days').notNull(),
    /** Longest shift a correction may record. */
    maxShiftHours: integer('max_shift_hours').notNull(),
    createdBy: integer('created_by').references(() => users.id),
    ...timestamps,
  },
  (t) => [
    check(
      'attendance_policies_grace',
      sql`${t.lateGraceMinutes} BETWEEN 0 AND 720`,
    ),
    check(
      'attendance_policies_standard',
      sql`${t.standardWorkMinutes} BETWEEN 1 AND 1440`,
    ),
    check(
      'attendance_policies_window',
      sql`${t.correctionWindowDays} BETWEEN 0 AND 366`,
    ),
    check(
      'attendance_policies_shift',
      sql`${t.maxShiftHours} BETWEEN 1 AND 48`,
    ),
  ],
);

export type AttendancePolicy = typeof attendancePolicies.$inferSelect;
