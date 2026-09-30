import { integer, pgEnum, pgTable, varchar } from 'drizzle-orm/pg-core';
import { UserRole } from '../../user/user.types.js';
import { timestamps } from './common.schema.js';

export const userRoleEnum = pgEnum(
  'user_role',
  Object.values(UserRole) as [UserRole, ...UserRole[]],
);

export const users = pgTable('users', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  firstName: varchar('first_name', { length: 50 }).notNull(),
  lastName: varchar('last_name', { length: 50 }).notNull(),
  email: varchar('email', { length: 100 }).unique().notNull(),
  password: varchar('password', { length: 255 }).notNull(),
  role: userRoleEnum('role').notNull().default(UserRole.Employee),
  ...timestamps,
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
