import { DATE_LOCALE, NUM_LOCALE } from './constants';

export function dateLabel(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getUTCDate()).padStart(2, '0');
  const mon = d.toLocaleString(NUM_LOCALE, { month: 'short', timeZone: 'UTC' }).toUpperCase();
  const yr = String(d.getUTCFullYear()).slice(-2);
  return `${day}${mon}${yr}`;
}

export const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString(DATE_LOCALE);

export const strikeFmt = (v: number) => `${(v / 1000).toLocaleString(NUM_LOCALE)}k`;

export const strikeFull = (v: number) => v.toLocaleString(NUM_LOCALE);

export const countShort = (v: number) =>
  v >= 1000
    ? `${(v / 1000).toLocaleString(NUM_LOCALE, { maximumFractionDigits: 1 })}k`
    : `${Math.round(v)}`;

export const countFull = (v: number) => v.toLocaleString(NUM_LOCALE, { maximumFractionDigits: 0 });

export const usdShort = (v: number) => {
  const abs = Math.abs(v);
  if (abs >= 1e9) return `$${(v / 1e9).toLocaleString(NUM_LOCALE, { maximumFractionDigits: 1 })}B`;
  if (abs >= 1e6) return `$${(v / 1e6).toLocaleString(NUM_LOCALE, { maximumFractionDigits: 1 })}M`;
  if (abs >= 1e3) return `$${(v / 1e3).toLocaleString(NUM_LOCALE, { maximumFractionDigits: 1 })}k`;
  return `$${Math.round(v)}`;
};

export const usdFull = (v: number) =>
  `$${v.toLocaleString(NUM_LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const usdWhole = (v: number) =>
  `$${v.toLocaleString(NUM_LOCALE, { maximumFractionDigits: 0 })}`;

export const priceWhole = (v: number) => v.toLocaleString(NUM_LOCALE, { maximumFractionDigits: 0 });

export const pctWhole = (v: number) => `${Math.round(v * 100)}%`;

export const pctOne = (v: number) => (v * 100).toFixed(1);

export const volPct = (v: number) => `${pctOne(v)}%`;

export const dvolFmt = (v: number) => (v * 100).toFixed(1);

export const dteLabel = (d: number) => `${Math.round(d)}d`;
