import { sql } from 'drizzle-orm';
import {
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { employees } from './employees.schema.js';
import { users } from './user.schema.js';
import { timestamps } from './common.schema.js';

export const remoteWorkStatusEnum = pgEnum('remote_work_status', [
  'pending',
  'approved',
  'rejected',
  'cancelled',
]);

/**
 * Permission to work remotely on days the arrangement expects the office.
 * Pending/approved requests of one employee can't overlap (exclusion
 * constraint added in the migration, like leave).
 */
export const remoteWorkRequests = pgTable(
  'remote_work_requests',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    employeeId: integer('employee_id')
      .references(() => employees.id)
      .notNull(),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    reason: varchar('reason', { length: 255 }).notNull(),
    status: remoteWorkStatusEnum('status').default('pending').notNull(),
    reviewedBy: integer('reviewed_by').references(() => users.id),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true, mode: 'date' }),
    ...timestamps,
  },
  (t) => [
    index('remote_work_requests_employee_idx').on(t.employeeId),
    index('remote_work_requests_pending_idx')
      .on(t.status)
      .where(sql`${t.status} = 'pending'`),
  ],
);

export type RemoteWorkRequest = typeof remoteWorkRequests.$inferSelect;
