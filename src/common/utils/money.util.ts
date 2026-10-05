/** Money is held as decimal strings; arithmetic happens in integer minor units. */

/** "1234.5" -> 123450 */
export function toMinor(amount: string | number): number {
  return Math.round(Number(amount) * 100);
}

/** 123450 -> "1234.50" */
export function fromMinor(minor: number): string {
  return (minor / 100).toFixed(2);
}
