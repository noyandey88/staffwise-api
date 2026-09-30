import { integer, pgTable, varchar } from 'drizzle-orm/pg-core';
import { timestamps } from './common.schema.js';

export const departments = pgTable('departments', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  ...timestamps,
});

export type NewDepartment = typeof departments.$inferInsert;
export type Department = typeof departments.$inferSelect;
