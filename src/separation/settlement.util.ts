import type { SettlementLine } from '../database/schema/separation.schema.js';
import { fromMinor, toMinor } from '../common/utils/money.util.js';

export { fromMinor, toMinor };

export function daysInMonth(date: string): number {
  const [y, m] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Final month's pay for days 1..lastDay: gross × lastDay / days in month. */
export function proRataSalary(grossMonthly: string, lastWorkingDay: string) {
  const day = Number(lastWorkingDay.slice(8, 10));
  const total = daysInMonth(lastWorkingDay);
  return {
    amount: fromMinor(Math.round((toMinor(grossMonthly) * day) / total)),
    note: `${day} of ${total} days`,
  };
}

/** basePay / 30 per day, the rate payroll uses for unpaid leave. */
export function perDay(basePay: string, days: number) {
  return fromMinor(Math.round((toMinor(basePay) * days) / 30));
}

export function totals(lines: SettlementLine[]) {
  let earnings = 0;
  let deductions = 0;
  for (const line of lines) {
    if (line.kind === 'earning') earnings += toMinor(line.amount);
    else deductions += toMinor(line.amount);
  }
  return {
    totalEarnings: fromMinor(earnings),
    totalDeductions: fromMinor(deductions),
    netPay: fromMinor(earnings - deductions),
  };
}
