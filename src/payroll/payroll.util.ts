/** Keeps the last 4 characters: "1234567890" -> "******7890". */
export function maskAccountNumber(accountNumber: string): string;
export function maskAccountNumber(accountNumber: string | null): string | null;
export function maskAccountNumber(accountNumber: string | null) {
  if (accountNumber === null) return null;
  const visible = accountNumber.slice(-4);
  return '*'.repeat(Math.max(accountNumber.length - 4, 0)) + visible;
}

/**
 * RFC 4180 CSV with every field quoted. Cells starting with a formula
 * trigger (= + - @ tab CR) are prefixed with ' so spreadsheets don't
 * evaluate employee-entered text.
 */
export function toCsv(rows: (string | number | null)[][]): string {
  return rows
    .map((row) =>
      row
        .map((value) => {
          let cell = value === null ? '' : String(value);
          if (/^[=+\-@\t\r]/.test(cell)) cell = `'${cell}`;
          return `"${cell.replace(/"/g, '""')}"`;
        })
        .join(','),
    )
    .join('\r\n');
}
