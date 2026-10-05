import type {
  WorkArrangement,
  WorkMode,
} from '../database/schema/work-arrangement.schema.js';

export interface ResolvedArrangement {
  mode: WorkMode;
  /** Fixed hybrid office days (Postgres dow), else null. */
  officeDays: number[] | null;
  /** Hybrid weekly quota, else null. */
  officeDaysPerWeek: number | null;
  /** Which level it came from; 'default' = nothing configured (onsite). */
  source: 'employee' | 'department' | 'company' | 'default';
  arrangementId: number | null;
  effectiveFrom: string | null;
}

export const DEFAULT_ARRANGEMENT: ResolvedArrangement = {
  mode: 'onsite',
  officeDays: null,
  officeDaysPerWeek: null,
  source: 'default',
  arrangementId: null,
  effectiveFrom: null,
};

/**
 * The arrangement governing `date`: the employee's own latest, else their
 * department's, else the company's (each: latest effective_from <= date).
 * `candidates` may contain any rows; only matching ones are considered.
 */
export function resolveArrangement(
  candidates: WorkArrangement[],
  employee: { id: number; departmentId: number },
  date: string,
): ResolvedArrangement {
  const latest = (match: (a: WorkArrangement) => boolean) =>
    candidates
      .filter((a) => match(a) && a.effectiveFrom <= date)
      .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
  const found =
    latest((a) => a.scope === 'employee' && a.employeeId === employee.id) ??
    latest(
      (a) =>
        a.scope === 'department' && a.departmentId === employee.departmentId,
    ) ??
    latest((a) => a.scope === 'company');
  if (!found) return DEFAULT_ARRANGEMENT;
  return {
    mode: found.mode,
    officeDays: found.officeDays,
    officeDaysPerWeek: found.officeDaysPerWeek,
    source: found.scope,
    arrangementId: found.id,
    effectiveFrom: found.effectiveFrom,
  };
}

/**
 * Whether the employee is expected in the office on a given weekday:
 * true/false, or null when it's their choice (remote quota-free days,
 * hybrid with a weekly quota). Weekends/holidays are the caller's concern.
 */
export function expectedInOffice(
  arrangement: Pick<ResolvedArrangement, 'mode' | 'officeDays'>,
  dayOfWeek: number,
): boolean | null {
  switch (arrangement.mode) {
    case 'onsite':
      return true;
    case 'remote':
      return false;
    case 'hybrid':
      return arrangement.officeDays
        ? arrangement.officeDays.includes(dayOfWeek)
        : null;
  }
}
