import { DAYS_PER_YEAR } from './constants';

// window a point list by days-to-expiry (points carry tte_years); both bounds inclusive
export function filterByDte<T extends { tte_years: number }>(
  points: T[],
  minDte: number,
  maxDte: number,
): T[] {
  const min = minDte / DAYS_PER_YEAR;
  const max = maxDte / DAYS_PER_YEAR;
  return points.filter((p) => p.tte_years >= min && p.tte_years <= max);
}
