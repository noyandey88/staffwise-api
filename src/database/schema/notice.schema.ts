import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from './user.schema.js';
import { departments } from './departments.schema.js';
import { timestamps } from './common.schema.js';

/**
 * Notice board. A null department_id means company-wide; published_at in
 * the future schedules a notice, and expires_at (exclusive) retires it.
 */
export const notices = pgTable(
  'notices',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    title: varchar('title', { length: 150 }).notNull(),
    body: text('body').notNull(),
    departmentId: integer('department_id').references(() => departments.id, {
      onDelete: 'cascade',
    }),
    pinned: boolean('pinned').default(false).notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }),
    createdBy: integer('created_by')
      .references(() => users.id)
      .notNull(),
    ...timestamps,
  },
  (t) => [index('notices_published_at_idx').on(t.publishedAt)],
);

export type Notice = typeof notices.$inferSelect;
export type NewNotice = typeof notices.$inferInsert;
