import {
  integer,
  pgEnum,
  pgTable,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { UserRole } from '../../user/user.types.js';

export const userRoleEnum = pgEnum(
  'user_role',
  Object.values(UserRole) as [string, ...string[]],
);

export const users = pgTable('users', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  firstName: varchar('first_name', { length: 50 }).notNull(),
  lastName: varchar('last_name', { length: 50 }).notNull(),
  email: varchar('email', { length: 100 }).unique().notNull(),
  password: varchar('password', { length: 255 }).notNull(),
  role: userRoleEnum('role').notNull().default(UserRole.Employee),
  createdAt: timestamp('created_At', {
    withTimezone: true,
    mode: 'date',
  }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
    .defaultNow()
    .$onUpdate(() => new Date()),
});
