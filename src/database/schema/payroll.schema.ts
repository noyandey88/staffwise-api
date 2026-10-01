import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  integer,
  numeric,
  pgEnum,
  pgTable,
  timestamp,
  unique,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { timestamps } from './common.schema.js';
import { employees } from './employees.schema.js';

export const payrollRunStatusEnum = pgEnum('payroll_run_status', [
  'draft',
  'approved',
  'paid',
]);

/**
 * Salary history: a run uses each employee's latest row whose
 * effective_from falls on or before the end of the payroll month.
 */
export const salaryStructures = pgTable(
  'salary_structures',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    employeeId: integer('employee_id')
      .references(() => employees.id)
      .notNull(),
    basePay: numeric('base_pay', { precision: 12, scale: 2 }).notNull(),
    allowances: numeric('allowances', { precision: 12, scale: 2 }).notNull(),
    effectiveFrom: date('effective_from').notNull(),
    ...timestamps,
  },
  (t) => [
    unique('salary_structures_employee_effective_uq').on(
      t.employeeId,
      t.effectiveFrom,
    ),
  ],
);

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

/**
 * Where an employee's salary is deposited. At most one primary account
 * per employee; approving a run copies it onto each payslip.
 */
export const employeeBankAccounts = pgTable(
  'employee_bank_accounts',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    employeeId: integer('employee_id')
      .references(() => employees.id)
      .notNull(),
    accountHolderName: varchar('account_holder_name', {
      length: 150,
    }).notNull(),
    bankName: varchar('bank_name', { length: 100 }).notNull(),
    branchName: varchar('branch_name', { length: 100 }),
    // 34 = longest IBAN
    accountNumber: varchar('account_number', { length: 34 }).notNull(),
    routingNumber: varchar('routing_number', { length: 20 }),
    isPrimary: boolean('is_primary').default(false).notNull(),
    ...timestamps,
  },
  (t) => [
    unique('employee_bank_accounts_employee_account_uq').on(
      t.employeeId,
      t.accountNumber,
    ),
    uniqueIndex('employee_bank_accounts_one_primary_idx')
      .on(t.employeeId)
      .where(sql`${t.isPrimary}`),
  ],
);

export const payslips = pgTable(
  'pay_slips',
  {
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
    // Snapshot of the primary bank account, taken when the run is approved.
    bankAccountHolderName: varchar('bank_account_holder_name', { length: 150 }),
    bankName: varchar('bank_name', { length: 100 }),
    bankBranchName: varchar('bank_branch_name', { length: 100 }),
    bankAccountNumber: varchar('bank_account_number', { length: 34 }),
    bankRoutingNumber: varchar('bank_routing_number', { length: 20 }),
    ...timestamps,
  },
  (t) => [unique('pay_slips_run_employee_uq').on(t.payrollRunId, t.employeeId)],
);

export type SalaryStructure = typeof salaryStructures.$inferSelect;
export type PayrollRun = typeof payrollRuns.$inferSelect;
export type Payslip = typeof payslips.$inferSelect;
export type EmployeeBankAccount = typeof employeeBankAccounts.$inferSelect;
export type NewEmployeeBankAccount = typeof employeeBankAccounts.$inferInsert;
