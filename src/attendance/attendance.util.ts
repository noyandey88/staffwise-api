import { ATTENDANCE_TIMEZONE } from './attendance.constants.js';

/** Today's date (YYYY-MM-DD) in the attendance timezone. */
export function today(): string {
  // 'en-CA' formats as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ATTENDANCE_TIMEZONE,
  }).format(new Date());
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
