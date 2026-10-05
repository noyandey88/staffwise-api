import {
  bigint,
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from './user.schema.js';

/** Field-level changes: { field: { from, to } }. */
export type AuditChanges = Record<string, { from: unknown; to: unknown }>;

/** Append-only record of sensitive changes (see AuditService). */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    /** null for unauthenticated actions (e.g. a password reset link). */
    actorUserId: integer('actor_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    /** <entity>.<verb>, e.g. "salary.created", "payroll_run.approved". */
    action: varchar('action', { length: 100 }).notNull(),
    entityType: varchar('entity_type', { length: 50 }).notNull(),
    entityId: varchar('entity_id', { length: 50 }).notNull(),
    changes: jsonb('changes').$type<AuditChanges>(),
    /** Free-form context (e.g. the payroll month). */
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    ip: varchar('ip', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index('audit_logs_entity_idx').on(t.entityType, t.entityId),
    index('audit_logs_actor_idx').on(t.actorUserId),
    index('audit_logs_created_at_idx').on(t.createdAt),
  ],
);

export type AuditLog = typeof auditLogs.$inferSelect;
