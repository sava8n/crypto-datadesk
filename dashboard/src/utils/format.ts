// Shared display formatters for chart axes and labels.

// Deribit expiries are at 08:00 UTC; 
// Format like "04JUL26" (day + upper month + 2-digit year).
export function expiryLabel(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getUTCDate()).padStart(2, '0');
  const mon = d
    .toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })
    .toUpperCase();
  const yr = String(d.getUTCFullYear()).slice(-2);
  return `${day}${mon}${yr}`;
}

// strike axis: 62000 -> "62k".
export const strikeFmt = (v: number) => `${(v / 1000).toLocaleString('en-US')}k`;
