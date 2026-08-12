// Shared display formatters for chart axes, tooltips and labels.

import { DATE_LOCALE, NUM_LOCALE } from './constants';

// UTC date of an ISO instant: "04JUL26" (day + upper month + 2-digit year)
export function dateLabel(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getUTCDate()).padStart(2, '0');
  const mon = d.toLocaleString(NUM_LOCALE, { month: 'short', timeZone: 'UTC' }).toUpperCase();
  const yr = String(d.getUTCFullYear()).slice(-2);
  return `${day}${mon}${yr}`;
}

// wall-clock time of an ISO instant: "14:32:05"
export const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString(DATE_LOCALE);

// strike axis: 62000 -> "62k"
export const strikeFmt = (v: number) => `${(v / 1000).toLocaleString(NUM_LOCALE)}k`;

// strike in full, for tooltips: 62500 -> "62,500"
export const strikeFull = (v: number) => v.toLocaleString(NUM_LOCALE);

// contract counts, abbreviated: 62000 -> "62k"
export const countShort = (v: number) =>
  v >= 1000
    ? `${(v / 1000).toLocaleString(NUM_LOCALE, { maximumFractionDigits: 1 })}k`
    : `${Math.round(v)}`;

// contract counts, full: 1234567 -> "1,234,567"
export const countFull = (v: number) => v.toLocaleString(NUM_LOCALE, { maximumFractionDigits: 0 });

// USD, abbreviated: 12_500_000 -> "$12.5M"
export const usdShort = (v: number) => {
  const abs = Math.abs(v);
  if (abs >= 1e9) return `$${(v / 1e9).toLocaleString(NUM_LOCALE, { maximumFractionDigits: 1 })}B`;
  if (abs >= 1e6) return `$${(v / 1e6).toLocaleString(NUM_LOCALE, { maximumFractionDigits: 1 })}M`;
  if (abs >= 1e3) return `$${(v / 1e3).toLocaleString(NUM_LOCALE, { maximumFractionDigits: 1 })}k`;
  return `$${Math.round(v)}`;
};

// USD, full: 61500 -> "$61,500.00"
export const usdFull = (v: number) =>
  `$${v.toLocaleString(NUM_LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// price, whole units, unprefixed for price axes: 61500.4 -> "61,500"
export const priceWhole = (v: number) => v.toLocaleString(NUM_LOCALE, { maximumFractionDigits: 0 });

// fraction as a whole percent: 0.42 -> "42%"
export const pctWhole = (v: number) => `${Math.round(v * 100)}%`;

// fraction as a one-decimal percent, unsuffixed: 0.4237 -> "42.4"
export const pctOne = (v: number) => (v * 100).toFixed(1);

// the same, suffixed - the vol/skew/basis axes and tooltips: 0.4237 -> "42.4%"
export const volPct = (v: number) => `${pctOne(v)}%`;

// DVOL index level: 0.382 -> "38.2"
export const dvolFmt = (v: number) => (v * 100).toFixed(1);

// days to expiry: 6.7 -> "7d"
export const dteLabel = (d: number) => `${Math.round(d)}d`;
