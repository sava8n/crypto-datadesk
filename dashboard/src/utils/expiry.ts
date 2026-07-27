import { MS_PER_DAY } from './constants';

export type FrontExpiry = 'weekly' | 'monthly';

// Deribit weeklies settle on a Friday, monthlies on the last Friday of a month
function isWeekly(d: Date): boolean {
  return d.getUTCDay() === 5;
}

function isMonthly(d: Date): boolean {
  if (!isWeekly(d)) return false;
  return new Date(d.getTime() + 7 * MS_PER_DAY).getUTCMonth() !== d.getUTCMonth();
}

// falls back to the nearest expiry when the chain lists no match
export function frontExpiry(expiries: string[], mode: FrontExpiry): string | undefined {
  const match = mode === 'monthly' ? isMonthly : isWeekly;
  return expiries.find((iso) => match(new Date(iso))) ?? expiries[0];
}
