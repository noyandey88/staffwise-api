/** Postgres error codes that repositories translate into HTTP errors. */
export const PG_UNIQUE_VIOLATION = '23505';
export const PG_EXCLUSION_VIOLATION = '23P01';

/**
 * Whether `err` is a Postgres error with this code. Drizzle wraps driver
 * errors (DrizzleQueryError), so the pg error may sit in `.cause`.
 */
export function isPgError(err: unknown, code: string): boolean {
  for (let e = err; typeof e === 'object' && e !== null;) {
    if ('code' in e && e.code === code) return true;
    e = 'cause' in e ? e.cause : undefined;
  }
  return false;
}
