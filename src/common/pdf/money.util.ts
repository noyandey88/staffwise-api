/** Currencies written with lakh/crore grouping and words. */
const SOUTH_ASIAN = new Set(['BDT', 'INR', 'NPR', 'PKR', 'LKR']);
const UNIT_NAMES: Record<string, [major: string, minor: string]> = {
  BDT: ['Taka', 'Paisa'],
  INR: ['Rupees', 'Paise'],
  USD: ['US Dollars', 'Cents'],
  EUR: ['Euros', 'Cents'],
  GBP: ['Pounds', 'Pence'],
};

const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];
const TENS = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
];

/** Splits a decimal string ("55000.5") into whole units and hundredths. */
function parse(amount: string): { major: bigint; minor: number } {
  const [whole, fraction = ''] = amount.trim().split('.');
  return {
    major: BigInt(whole || '0'),
    minor: Number((fraction + '00').slice(0, 2)),
  };
}

function belowHundred(n: number): string {
  if (n < 20) return ONES[n];
  return TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : '');
}

function belowThousand(n: number): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  return [
    hundreds ? `${ONES[hundreds]} Hundred` : '',
    rest ? belowHundred(rest) : '',
  ]
    .filter(Boolean)
    .join(' ');
}

function words(n: bigint, southAsian: boolean): string {
  if (n === 0n) return 'Zero';
  const scales: [bigint, string][] = southAsian
    ? [
        [10_000_000n, 'Crore'],
        [100_000n, 'Lakh'],
        [1_000n, 'Thousand'],
      ]
    : [
        [1_000_000_000n, 'Billion'],
        [1_000_000n, 'Million'],
        [1_000n, 'Thousand'],
      ];
  const parts: string[] = [];
  let rest = n;
  for (const [size, name] of scales) {
    if (rest >= size) {
      // Crores can exceed 99, so recurse for the multiplier.
      parts.push(`${words(rest / size, southAsian)} ${name}`);
      rest %= size;
    }
  }
  if (rest > 0n) parts.push(belowThousand(Number(rest)));
  return parts.join(' ');
}

/** "BDT 1,50,000.00" (lakh grouping for South Asian currencies). */
export function formatMoney(amount: string, currency: string): string {
  const { major, minor } = parse(amount);
  const grouped = major.toLocaleString(
    SOUTH_ASIAN.has(currency) ? 'en-IN' : 'en-US',
  );
  return `${currency} ${grouped}.${String(minor).padStart(2, '0')}`;
}

/** "Taka One Lakh Fifty Thousand and Fifty Paisa Only". */
export function amountInWords(amount: string, currency: string): string {
  const { major, minor } = parse(amount);
  const [majorName, minorName] = UNIT_NAMES[currency] ?? [currency, 'Cents'];
  const southAsian = SOUTH_ASIAN.has(currency);
  const minorPart = minor ? ` and ${belowHundred(minor)} ${minorName}` : '';
  return `${majorName} ${words(major, southAsian)}${minorPart} Only`;
}
