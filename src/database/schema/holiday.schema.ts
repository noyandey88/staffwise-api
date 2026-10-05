import { date, integer, pgTable, varchar } from 'drizzle-orm/pg-core';
import { timestamps } from './common.schema.js';

/** Company-wide public holidays; one row per calendar date. */
export const holidays = pgTable('holidays', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  date: date('date').notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  ...timestamps,
});

export type Holiday = typeof holidays.$inferSelect;
export type NewHoliday = typeof holidays.$inferInsert;
