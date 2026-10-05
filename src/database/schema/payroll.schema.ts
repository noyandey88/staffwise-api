import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
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
import { users } from './user.schema.js';

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
    /** User id, so accounts without an employee record (super admin) can approve. */
    approvedBy: integer('approved_by').references(() => users.id),
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

export const payComponentKindEnum = pgEnum('pay_component_kind', [
  'earning',
  'deduction',
]);

export const payComponentCalculationEnum = pgEnum('pay_component_calculation', [
  'fixed',
  'percent_of_basic',
  'percent_of_gross',
]);

/**
 * HR-defined earnings and deductions (provident fund, transport
 * allowance, income tax, loan instalment, …). Percentages apply to the
 * salary structure's basic or gross (basic + allowances).
 */
export const payComponents = pgTable('pay_components', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  kind: payComponentKindEnum('kind').notNull(),
  calculation: payComponentCalculationEnum('calculation').notNull(),
  /** Amount (fixed) or percentage (e.g. 10.00); employees can override. */
  defaultValue: numeric('default_value', { precision: 12, scale: 2 }).notNull(),
  /** Applies to every employee without an assignment of their own. */
  appliesToAll: boolean('applies_to_all').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  ...timestamps,
});

/** A component for one employee, optionally overriding the value, for a period. */
export const employeePayComponents = pgTable(
  'employee_pay_components',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    employeeId: integer('employee_id')
      .references(() => employees.id)
      .notNull(),
    componentId: integer('component_id')
      .references(() => payComponents.id)
      .notNull(),
    /** null = the component's default value. */
    value: numeric('value', { precision: 12, scale: 2 }),
    effectiveFrom: date('effective_from').notNull(),
    /** Inclusive; null = open-ended. */
    effectiveTo: date('effective_to'),
    ...timestamps,
  },
  (t) => [index('employee_pay_components_employee_idx').on(t.employeeId)],
);

/** What a daily rate is a fraction of. */
export const rateBaseEnum = pgEnum('rate_base', ['basic', 'gross']);

/** How many days a month is divided into. */
export const dayCountEnum = pgEnum('day_count', [
  'fixed',
  'calendar_days',
  'working_days',
]);

/**
 * Single-row (id = 1) payroll rules each deployment chooses. The column
 * defaults reproduce the original hardcoded behaviour.
 */
export const payrollPolicy = pgTable(
  'payroll_policy',
  {
    id: integer().primaryKey().default(1),
    /** Unpaid leave deduction per working day = base / divisor. */
    unpaidLeaveRateBase: rateBaseEnum('unpaid_leave_rate_base')
      .default('basic')
      .notNull(),
    unpaidLeaveDivisor: dayCountEnum('unpaid_leave_divisor')
      .default('fixed')
      .notNull(),
    unpaidLeaveFixedDays: integer('unpaid_leave_fixed_days')
      .default(30)
      .notNull(),
    /** Leave encashment per day = base / divisor. */
    encashmentRateBase: rateBaseEnum('encashment_rate_base')
      .default('basic')
      .notNull(),
    encashmentDivisor: dayCountEnum('encashment_divisor')
      .default('fixed')
      .notNull(),
    encashmentFixedDays: integer('encashment_fixed_days').default(30).notNull(),
    /** Partial months (joiners, leavers): share of the month that is paid. */
    proRataMethod: dayCountEnum('pro_rata_method')
      .default('calendar_days')
      .notNull(),
    proRataFixedDays: integer('pro_rata_fixed_days').default(30).notNull(),
    /** Pro-rate the month an employee joins. */
    prorateJoiners: boolean('prorate_joiners').default(false).notNull(),
    /** Also pro-rate fixed-amount components (percentages always follow pay). */
    prorateFixedComponents: boolean('prorate_fixed_components')
      .default(false)
      .notNull(),
    updatedBy: integer('updated_by').references(() => users.id),
    ...timestamps,
  },
  (t) => [check('payroll_policy_singleton', sql`${t.id} = 1`)],
);

export type PayrollPolicy = typeof payrollPolicy.$inferSelect;

export type PayslipLineSource = 'component' | 'unpaid_leave' | 'adjustment';

export interface PayslipLine {
  label: string;
  kind: 'earning' | 'deduction';
  /** Positive decimal string. */
  amount: string;
  source: PayslipLineSource;
  note?: string;
}

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
    /** basePay + allowances + earning lines. */
    grossPay: numeric('gross_pay', { precision: 12, scale: 2 }).notNull(),
    /** Sum of deduction lines. */
    deductions: numeric('deductions', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    /** Itemized earnings/deductions beyond basic and allowances. */
    lines: jsonb('lines').$type<PayslipLine[]>().default([]).notNull(),
    netPay: numeric('net_pay', { precision: 12, scale: 2 }).notNull(),
    unpaidLeaveDays: integer('unpaid_leave_days').notNull().default(0),
    /** Set when basic/allowances were pro-rated (e.g. joined mid-month). */
    proRataNote: varchar('pro_rata_note', { length: 200 }),
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
export type PayComponent = typeof payComponents.$inferSelect;
export type EmployeePayComponent = typeof employeePayComponents.$inferSelect;
export type EmployeeBankAccount = typeof employeeBankAccounts.$inferSelect;
export type NewEmployeeBankAccount = typeof employeeBankAccounts.$inferInsert;
