import type { PayrollPolicy } from '../database/schema/payroll.schema.js';
import { fromMinor, toMinor } from '../common/utils/money.util.js';

/** Calendar and working days in a period (a month, or part of one). */
export interface DayCounts {
  calendarDays: number;
  workingDays: number;
}

export type DayCount = PayrollPolicy['proRataMethod'];
export type RateBase = PayrollPolicy['unpaidLeaveRateBase'];

/** The original hardcoded rules; also the column defaults. */
export const DEFAULT_PAYROLL_POLICY = {
  unpaidLeaveRateBase: 'basic',
  unpaidLeaveDivisor: 'fixed',
  unpaidLeaveFixedDays: 30,
  encashmentRateBase: 'basic',
  encashmentDivisor: 'fixed',
  encashmentFixedDays: 30,
  proRataMethod: 'calendar_days',
  proRataFixedDays: 30,
  prorateJoiners: false,
  prorateFixedComponents: false,
} as const satisfies Partial<PayrollPolicy>;

export type PolicyRules = Pick<
  PayrollPolicy,
  keyof typeof DEFAULT_PAYROLL_POLICY
>;

function divisor(kind: DayCount, fixedDays: number, month: DayCounts) {
  const days =
    kind === 'fixed'
      ? fixedDays
      : kind === 'calendar_days'
        ? month.calendarDays
        : month.workingDays;
  return {
    days: Math.max(days, 1), // a month with no working days can't divide by 0
    label:
      kind === 'fixed'
        ? `${fixedDays}`
        : `${days} ${kind === 'calendar_days' ? 'calendar' : 'working'} days`,
  };
}

/**
 * `days` × (basic or gross) / divisor, from the full monthly salary.
 * Used for unpaid leave deductions and leave encashment.
 */
export function amountForDays(
  rule: { base: RateBase; divisor: DayCount; fixedDays: number },
  salary: { basePay: string; allowances: string },
  month: DayCounts,
  days: number,
) {
  const baseMinor =
    toMinor(salary.basePay) +
    (rule.base === 'gross' ? toMinor(salary.allowances) : 0);
  const d = divisor(rule.divisor, rule.fixedDays, month);
  return {
    amount: fromMinor(Math.round((baseMinor * days) / d.days)),
    note: `${days} day(s) × ${rule.base} / ${d.label}`,
  };
}

export const unpaidLeaveRule = (p: PolicyRules) => ({
  base: p.unpaidLeaveRateBase,
  divisor: p.unpaidLeaveDivisor,
  fixedDays: p.unpaidLeaveFixedDays,
});

export const encashmentRule = (p: PolicyRules) => ({
  base: p.encashmentRateBase,
  divisor: p.encashmentDivisor,
  fixedDays: p.encashmentFixedDays,
});

/**
 * Share of a month that is paid when only part of it was worked.
 * `fixed` treats every month as N days (a full month is always 1).
 */
export function proRata(
  p: Pick<PolicyRules, 'proRataMethod' | 'proRataFixedDays'>,
  worked: DayCounts,
  month: DayCounts,
) {
  let num: number;
  let den: number;
  let unit: string;
  switch (p.proRataMethod) {
    case 'calendar_days':
      [num, den, unit] = [
        worked.calendarDays,
        month.calendarDays,
        'calendar days',
      ];
      break;
    case 'working_days':
      [num, den, unit] = [
        worked.workingDays,
        month.workingDays,
        'working days',
      ];
      break;
    case 'fixed':
      den = p.proRataFixedDays;
      num =
        worked.calendarDays >= month.calendarDays
          ? den
          : Math.min(worked.calendarDays, den);
      unit = `days (${den}-day month)`;
      break;
  }
  den = Math.max(den, 1);
  return {
    apply: (amount: string) =>
      fromMinor(Math.round((toMinor(amount) * Math.min(num, den)) / den)),
    full: num >= den,
    note: `${Math.min(num, den)} of ${den} ${unit}`,
  };
}
