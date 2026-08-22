import { nearestIdx } from '../components/exposure/nearest';
import type { StrikeRange } from '../config';

// inclusive |K/S - 1| <= range; 'all' or an unknown spot keeps every strike
export function filterByMoneyness<T extends { strike: number }>(
  points: T[],
  spot: number | null,
  range: StrikeRange,
): T[] {
  if (range === 'all' || spot == null || spot <= 0) return points;
  const pct = Number(range) / 100;
  return points.filter((p) => Math.abs(p.strike / spot - 1) <= pct);
}

// nearest quoted strike to a level, or -1 when the level falls outside the ascending list,
// a level beyond the shown range must not pin to the edge bar
export function levelIdx(strikes: number[], level: number | null): number {
  if (level == null || strikes.length === 0) return -1;
  if (level < strikes[0] || level > strikes[strikes.length - 1]) return -1;
  return nearestIdx(strikes, level);
}
