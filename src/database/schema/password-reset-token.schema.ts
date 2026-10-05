import {
  index,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from './user.schema.js';

/** reset = forgot password; setup = first password for a new account. */
export const passwordTokenPurposeEnum = pgEnum('password_token_purpose', [
  'reset',
  'setup',
]);

/** One-time links that let a user set a new password. */
export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** SHA-256 hex digest of the token in the emailed link. */
    tokenHash: varchar('token_hash', { length: 64 }).notNull(),
    purpose: passwordTokenPurposeEnum('purpose').notNull(),
    expiresAt: timestamp('expires_at', {
      withTimezone: true,
      mode: 'date',
    }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      mode: 'date',
    })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex('password_reset_tokens_hash_idx').on(t.tokenHash),
    index('password_reset_tokens_user_idx').on(t.userId),
  ],
);

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
