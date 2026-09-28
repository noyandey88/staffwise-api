import { integer, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';

export const departments = pgTable('departments', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  createdAt: timestamp('created_at', {
    withTimezone: true,
    mode: 'date',
  }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type NewDepartment = typeof departments.$inferInsert;
export type Department = typeof departments.$inferSelect;
