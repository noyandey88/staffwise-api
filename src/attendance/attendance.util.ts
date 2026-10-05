import { DEFAULT_ATTENDANCE_POLICY } from './attendance.constants.js';

/**
 * The organisation's timezone, kept current by AttendancePolicyService
 * (loaded at startup, refreshed every minute and on change). Module state
 * so the many synchronous today()/localDate() callers need no injection.
 */
let timezone: string = DEFAULT_ATTENDANCE_POLICY.timezone;

export function activeTimezone(): string {
  return timezone;
}

export function setActiveTimezone(tz: string) {
  timezone = tz;
}

/** The calendar date (YYYY-MM-DD) of an instant in the organisation's timezone. */
export function localDate(instant: Date, tz: string = timezone): string {
  // 'en-CA' formats as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(instant);
}

/** Today's date (YYYY-MM-DD) in the organisation's timezone. */
export function today(): string {
  return localDate(new Date());
}

/** Shifts a YYYY-MM-DD date by whole days. */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function currentMonth(): string {
  return today().slice(0, 7);
}

/** Half-open range: start inclusive, end exclusive. */
export function monthRange(month: string) {
  const [y, m] = month.split('-').map(Number);
  const end =
    m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
  return { start: `${month}-01`, end };
}
