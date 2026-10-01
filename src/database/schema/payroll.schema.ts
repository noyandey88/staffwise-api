import {
  date,
  integer,
  numeric,
  pgEnum,
  pgTable,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';
import { timestamps } from './common.schema.js';
import { employees } from './employees.schema.js';

export const payrollRunStatusEnum = pgEnum('payroll_run_status', [
  'draft',
  'approved',
  'paid',
]);

export const salaryStructures = pgTable('salary_structures', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  employeeId: integer('employee_id')
    .references(() => employees.id)
    .unique()
    .notNull(),
  basePay: numeric('base_pay', { precision: 12, scale: 2 }).notNull(),
  allowances: numeric('allowances', { precision: 12, scale: 2 }).notNull(),
  effectiveFrom: date('effective_from').notNull(),
  ...timestamps,
});

export const payrollRuns = pgTable(
  'payroll_runs',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    month: date('month').notNull(),
    status: payrollRunStatusEnum('status').default('draft').notNull(),
    generatedAt: timestamp('generated_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .notNull(),
    approvedAt: timestamp('approved_at', { withTimezone: true, mode: 'date' }),
    approvedBy: integer('approved_by').references(() => employees.id),
  },
  (t) => [unique('payroll_run_month_eq').on(t.month)],
);

export const payslips = pgTable('pay_slips', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  payrollRunId: integer('payroll_run_id')
    .references(() => payrollRuns.id)
    .notNull(),
  employeeId: integer('employee_id')
    .references(() => employees.id)
    .notNull(),
  basePay: numeric('base_pay', { precision: 12, scale: 2 }).notNull(),
  allowances: numeric('allowances', { precision: 12, scale: 2 }).notNull(),
  deductions: numeric('deductions', { precision: 12, scale: 2 })
    .notNull()
    .default('0'),
  netPay: numeric('net_pay', { precision: 12, scale: 2 }).notNull(),
  unpaidLeaveDays: integer('unpaid_leave_days').notNull().default(0),
  ...timestamps,
});

export type SalaryStructure = typeof salaryStructures.$inferSelect;
export type PayrollRun = typeof payrollRuns.$inferSelect;
export type Payslip = typeof payslips.$inferSelect;
