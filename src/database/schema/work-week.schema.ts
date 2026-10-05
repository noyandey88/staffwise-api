import { date, integer, pgTable } from 'drizzle-orm/pg-core';
import { users } from './user.schema.js';
import { timestamps } from './common.schema.js';

/**
 * Which days of the week are off, from a date onward. The row with the
 * latest effective_from on or before a day governs that day, so changing
 * the work week never rewrites earlier months.
 */
export const workWeeks = pgTable('work_weeks', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  effectiveFrom: date('effective_from').notNull().unique(),
  /** Days off, 0 = Sunday … 6 = Saturday (Postgres `dow`); may be empty. */
  weekendDays: integer('weekend_days').array().notNull(),
  createdBy: integer('created_by').references(() => users.id),
  ...timestamps,
});

export type WorkWeek = typeof workWeeks.$inferSelect;
