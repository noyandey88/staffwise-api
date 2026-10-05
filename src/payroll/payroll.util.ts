/** Keeps the last 4 characters: "1234567890" -> "******7890". */
export function maskAccountNumber(accountNumber: string): string;
export function maskAccountNumber(accountNumber: string | null): string | null;
export function maskAccountNumber(accountNumber: string | null) {
  if (accountNumber === null) return null;
  const visible = accountNumber.slice(-4);
  return '*'.repeat(Math.max(accountNumber.length - 4, 0)) + visible;
}
