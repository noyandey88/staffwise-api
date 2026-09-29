import {
  date,
  index,
  integer,
  pgTable,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';
import { employees } from './employees.schema.js';

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
    createdAt: timestamp('created_at', {
      withTimezone: true,
      mode: 'date',
    }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    unique('attendance_employee_date_uq').on(t.employeeId, t.workDate),
    index('attendance_work_date_idx').on(t.workDate),
  ],
);

export type AttendanceRecord = typeof attendanceRecords.$inferSelect;
