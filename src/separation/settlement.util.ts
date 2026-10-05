import type { SettlementLine } from '../database/schema/separation.schema.js';
import { fromMinor, toMinor } from '../common/utils/money.util.js';

export { fromMinor, toMinor };

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
