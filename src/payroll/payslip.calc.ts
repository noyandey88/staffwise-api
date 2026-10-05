import type {
  PayComponent,
  PayslipLine,
} from '../database/schema/payroll.schema.js';
import { fromMinor, toMinor } from '../common/utils/money.util.js';

/** A component as it applies to one employee this month. */
export interface AppliedComponent {
  component: Pick<PayComponent, 'name' | 'kind' | 'calculation'>;
  /** Employee override or the component default. */
  value: string;
}

/** One component line; percentages use the salary structure, never other lines. */
export function componentLine(
  applied: AppliedComponent,
  basePay: string,
  allowances: string,
): PayslipLine {
  const { component, value } = applied;
  let minor: number;
  let note: string | undefined;
  switch (component.calculation) {
    case 'fixed':
      minor = toMinor(value);
      break;
    case 'percent_of_basic':
      minor = Math.round((toMinor(basePay) * Number(value)) / 100);
      note = `${value}% of basic`;
      break;
    case 'percent_of_gross':
      minor = Math.round(
        ((toMinor(basePay) + toMinor(allowances)) * Number(value)) / 100,
      );
      note = `${value}% of gross`;
      break;
  }
  return {
    label: component.name,
    kind: component.kind,
    amount: fromMinor(minor),
    source: 'component',
    ...(note ? { note } : {}),
  };
}

/** Unpaid leave at basic / 30 per working day (the long-standing rule). */
export function unpaidLeaveLine(basePay: string, days: number): PayslipLine {
  return {
    label: 'Unpaid leave',
    kind: 'deduction',
    amount: fromMinor(Math.round((toMinor(basePay) * days) / 30)),
    source: 'unpaid_leave',
    note: `${days} working day(s) × basic / 30`,
  };
}

/** Gross, deductions and net from the structure plus the itemized lines. */
export function payslipTotals(
  basePay: string,
  allowances: string,
  lines: PayslipLine[],
) {
  let gross = toMinor(basePay) + toMinor(allowances);
  let deductions = 0;
  for (const line of lines) {
    if (line.kind === 'earning') gross += toMinor(line.amount);
    else deductions += toMinor(line.amount);
  }
  return {
    grossPay: fromMinor(gross),
    deductions: fromMinor(deductions),
    netPay: fromMinor(gross - deductions),
    negative: gross - deductions < 0,
  };
}
