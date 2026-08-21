import { MS_PER_DAY } from './constants';

export type FrontExpiry = 'weekly' | 'monthly';

// EXPIRY_ALL: every expiry where a chart supports it; the tenor literals track the front
// expiry; anything else is a concrete ISO expiry
export const EXPIRY_ALL = 'all';

// a concrete pick nearer than this resolves as weekly once it rolls off the chain
const WEEKLY_DTE_CUTOFF = 10;

export function expiriesOf(points: { expiry: string; tte_years: number }[] | undefined): string[] {
  if (!points) return [];
  const tte = new Map<string, number>();
  for (const p of points) if (!tte.has(p.expiry)) tte.set(p.expiry, p.tte_years);
  return [...tte.keys()].sort((a, b) => (tte.get(a) ?? 0) - (tte.get(b) ?? 0));
}

// Deribit weeklies settle on a Friday, monthlies on the last Friday of a month
function isWeekly(d: Date): boolean {
  return d.getUTCDay() === 5;
}

function isMonthly(d: Date): boolean {
  if (!isWeekly(d)) return false;
  return new Date(d.getTime() + 7 * MS_PER_DAY).getUTCMonth() !== d.getUTCMonth();
}

export function resolveFrontExpiry(expiries: string[], mode: FrontExpiry): string | undefined {
  const match = mode === 'monthly' ? isMonthly : isWeekly;
  return expiries.find((iso) => match(new Date(iso))) ?? expiries[0];
}

// tenor an expiry scope implies; EXPIRY_ALL and unparseable picks read as monthly
export function tenorOf(setting: string): FrontExpiry {
  if (setting === 'weekly' || setting === 'monthly') return setting;
  if (setting === EXPIRY_ALL) return 'monthly';
  const dte = (new Date(setting).getTime() - Date.now()) / MS_PER_DAY;
  return dte <= WEEKLY_DTE_CUTOFF ? 'weekly' : 'monthly';
}

// a concrete pick holds while quoted, otherwise the front expiry of the scope's tenor
export function resolveExpiry(setting: string, expiries: string[]): string | undefined {
  if (expiries.includes(setting)) return setting;
  return resolveFrontExpiry(expiries, tenorOf(setting));
}
