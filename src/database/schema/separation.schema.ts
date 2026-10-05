import { sql } from 'drizzle-orm';
import {
  char,
  date,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { employees } from './employees.schema.js';
import { users } from './user.schema.js';
import { timestamps } from './common.schema.js';

export const separationTypeEnum = pgEnum('separation_type', [
  'resignation',
  'termination',
  'retirement',
]);

/** requested → approved → completed (status applied); or rejected/cancelled. */
export const separationStatusEnum = pgEnum('separation_status', [
  'requested',
  'approved',
  'completed',
  'rejected',
  'cancelled',
]);

/** An employee leaving. The status change happens after the last day. */
export const separations = pgTable(
  'separations',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    employeeId: integer('employee_id')
      .references(() => employees.id)
      .notNull(),
    type: separationTypeEnum('type').notNull(),
    status: separationStatusEnum('status').default('requested').notNull(),
    reason: varchar('reason', { length: 500 }).notNull(),
    /** Inclusive: the employee still works this day. */
    lastWorkingDay: date('last_working_day').notNull(),
    requestedBy: integer('requested_by').references(() => users.id),
    reviewedBy: integer('reviewed_by').references(() => users.id),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true, mode: 'date' }),
    completedAt: timestamp('completed_at', {
      withTimezone: true,
      mode: 'date',
    }),
    ...timestamps,
  },
  (t) => [
    // One open (requested or approved) separation per employee.
    uniqueIndex('separations_open_uq')
      .on(t.employeeId)
      .where(sql`${t.status} IN ('requested', 'approved')`),
  ],
);

export type SettlementLineSource =
  'salary' | 'leave_encashment' | 'unpaid_leave' | 'manual';

export interface SettlementLine {
  label: string;
  kind: 'earning' | 'deduction';
  /** Positive decimal string. */
  amount: string;
  source: SettlementLineSource;
  /** How it was worked out, e.g. "20 days × 1,833.33". */
  note?: string;
}

export const settlementStatusEnum = pgEnum('settlement_status', [
  'draft',
  'finalized',
  'paid',
]);

/** Final pay for a separation; recomputable until finalized. */
export const finalSettlements = pgTable('final_settlements', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  separationId: integer('separation_id')
    .references(() => separations.id)
    .notNull()
    .unique(),
  employeeId: integer('employee_id')
    .references(() => employees.id)
    .notNull(),
  status: settlementStatusEnum('status').default('draft').notNull(),
  currency: char('currency', { length: 3 }).notNull(),
  lines: jsonb('lines').$type<SettlementLine[]>().notNull(),
  totalEarnings: numeric('total_earnings', {
    precision: 12,
    scale: 2,
  }).notNull(),
  totalDeductions: numeric('total_deductions', {
    precision: 12,
    scale: 2,
  }).notNull(),
  netPay: numeric('net_pay', { precision: 12, scale: 2 }).notNull(),
  finalizedBy: integer('finalized_by').references(() => users.id),
  finalizedAt: timestamp('finalized_at', { withTimezone: true, mode: 'date' }),
  paidAt: timestamp('paid_at', { withTimezone: true, mode: 'date' }),
  ...timestamps,
});

export type Separation = typeof separations.$inferSelect;
export type FinalSettlement = typeof finalSettlements.$inferSelect;
