import { sql } from 'drizzle-orm';
import {
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { departments } from './departments.schema.js';
import { employees } from './employees.schema.js';
import { users } from './user.schema.js';
import { timestamps } from './common.schema.js';

export const workModeEnum = pgEnum('work_mode', ['onsite', 'remote', 'hybrid']);

/** Who an arrangement applies to; the most specific one wins. */
export const workArrangementScopeEnum = pgEnum('work_arrangement_scope', [
  'company',
  'department',
  'employee',
]);

/**
 * Where people are expected to work, from a date onward. For a given day an
 * employee follows their own latest arrangement, else their department's,
 * else the company's, else onsite. Hybrid means either fixed office days
 * (`office_days`, Postgres dow) or a weekly quota (`office_days_per_week`).
 */
export const workArrangements = pgTable(
  'work_arrangements',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    scope: workArrangementScopeEnum('scope').notNull(),
    departmentId: integer('department_id').references(() => departments.id, {
      onDelete: 'cascade',
    }),
    employeeId: integer('employee_id').references(() => employees.id),
    mode: workModeEnum('mode').notNull(),
    officeDays: integer('office_days').array(),
    officeDaysPerWeek: integer('office_days_per_week'),
    effectiveFrom: date('effective_from').notNull(),
    createdBy: integer('created_by').references(() => users.id),
    ...timestamps,
  },
  (t) => [
    check(
      'work_arrangements_target',
      sql`(${t.scope} = 'company' AND ${t.departmentId} IS NULL AND ${t.employeeId} IS NULL)
       OR (${t.scope} = 'department' AND ${t.departmentId} IS NOT NULL AND ${t.employeeId} IS NULL)
       OR (${t.scope} = 'employee' AND ${t.employeeId} IS NOT NULL AND ${t.departmentId} IS NULL)`,
    ),
    check(
      'work_arrangements_hybrid',
      sql`(${t.mode} = 'hybrid' AND (
            (cardinality(${t.officeDays}) > 0 AND ${t.officeDaysPerWeek} IS NULL)
         OR (${t.officeDays} IS NULL AND ${t.officeDaysPerWeek} BETWEEN 1 AND 7)))
       OR (${t.mode} <> 'hybrid' AND ${t.officeDays} IS NULL AND ${t.officeDaysPerWeek} IS NULL)`,
    ),
    uniqueIndex('work_arrangements_target_from_uq').on(
      t.scope,
      sql`coalesce(${t.departmentId}, 0)`,
      sql`coalesce(${t.employeeId}, 0)`,
      t.effectiveFrom,
    ),
    index('work_arrangements_employee_idx').on(t.employeeId),
  ],
);

export type WorkArrangement = typeof workArrangements.$inferSelect;
export type WorkMode = WorkArrangement['mode'];
export type WorkArrangementScope = WorkArrangement['scope'];
