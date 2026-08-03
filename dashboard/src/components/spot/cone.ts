import type { ProbCurvesResponse } from '../../types';
import { MS_PER_DAY } from '../../utils/constants';

export interface ConeAnchor {
  expiry: string;
  p16: number | null;
  p50: number | null;
  p84: number | null;
}

// one daily step of the cone; a null edge is one the chain could not resolve
export interface ConePoint {
  time: string; // 'YYYY-MM-DD', the candle series' time key
  lo: number | null;
  mid: number | null;
  hi: number | null;
}

// implied quantiles at the expiry nearest the target
export function coneAnchor(
  prob: ProbCurvesResponse | undefined,
  expiry: string | undefined,
): ConeAnchor | undefined {
  if (!prob?.quantiles?.length || !expiry) return undefined;
  const target = Date.parse(expiry);
  const row = [...prob.quantiles].sort(
    (a, b) => Math.abs(Date.parse(a.expiry) - target) - Math.abs(Date.parse(b.expiry) - target),
  )[0];
  return { expiry: row.expiry, p16: row.p16, p50: row.p50, p84: row.p84 };
}

const dayKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/**
 * Daily path from spot today to the implied quantiles at expiry, inclusive of both ends.
 *
 * With u the elapsed fraction of the term, drift is linear in u and dispersion in sqrt(u):
 *   drift(u) = (p50/spot)^u,  hi(u) = spot·drift(u)·(p84/p50)^sqrt(u),  lo likewise with p16.
 * So u=0 collapses to spot and u=1 reproduces p16/p50/p84 exactly, keeping the smile's asymmetry.
 *
 * Empty when the expiry has already rolled past the last candle, or when spot is unusable.
 */
export function buildCone(
  spot: number,
  anchor: ConeAnchor,
  lastCandleDate: string,
): ConePoint[] {
  if (!(spot > 0)) return [];

  const start = Date.parse(`${lastCandleDate}T00:00:00Z`);
  const end = Date.parse(anchor.expiry);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return [];

  // the expiry settles at 08:00 UTC, so its own date is the last bar the cone reaches
  const steps = Math.round((Date.parse(`${dayKey(end)}T00:00:00Z`) - start) / MS_PER_DAY);
  if (steps < 1) return [];

  // a missing median leaves the cone driftless rather than dropping it
  const median = anchor.p50 != null && anchor.p50 > 0 ? anchor.p50 : spot;
  const edge = (terminal: number | null, u: number): number | null =>
    terminal != null && terminal > 0
      ? spot * (median / spot) ** u * (terminal / median) ** Math.sqrt(u)
      : null;

  return Array.from({ length: steps + 1 }, (_, i) => {
    const u = i / steps;
    return {
      time: dayKey(start + i * MS_PER_DAY),
      lo: edge(anchor.p16, u),
      mid: spot * (median / spot) ** u,
      hi: edge(anchor.p84, u),
    };
  });
}
