import type { AuditChanges } from '../database/schema/audit-log.schema.js';
import { maskAccountNumber } from '../payroll/payroll.util.js';

/** Never written to the audit log. */
const OMIT = new Set(['password', 'createdAt', 'updatedAt', 'tokenHash']);
/** Written masked. */
const MASK: Record<string, (value: unknown) => unknown> = {
  accountNumber: (v) => (typeof v === 'string' ? maskAccountNumber(v) : v),
};

const normalize = (value: unknown) =>
  value instanceof Date ? value.toISOString() : (value ?? null);

/**
 * Field-level diff of two records (either may be missing for create/
 * delete); unchanged and omitted fields are left out.
 */
export function diff(
  before: object | null | undefined,
  after: object | null | undefined,
): AuditChanges {
  const from = (before ?? {}) as Record<string, unknown>;
  const to = (after ?? {}) as Record<string, unknown>;
  const changes: AuditChanges = {};
  for (const key of new Set([...Object.keys(from), ...Object.keys(to)])) {
    if (OMIT.has(key)) continue;
    const a = normalize(from[key]);
    const b = normalize(to[key]);
    if (JSON.stringify(a) === JSON.stringify(b)) continue;
    const mask = MASK[key] ?? ((v: unknown) => v);
    changes[key] = { from: mask(a), to: mask(b) };
  }
  return changes;
}
