// Per-expiry settlement/expected-move summary: max pain joined with the implied
// distribution's quantiles, both already served per expiry.

import { DAYS_PER_YEAR } from '../../utils/constants';
import type { MaxPainResponse, ProbQuantilePoint } from '../../types';

export interface ExpiryRow {
  expiry: string;
  dte: number;
  maxPain: number | null;
  // max pain distance from spot, signed fraction
  maxPainPct: number | null;
  // half the p16-p84 spread: the implied +-1 sigma move in USD
  em: number | null;
  emPct: number | null;
}

export function buildExpiryRows(
  maxPain: MaxPainResponse,
  quantiles: ProbQuantilePoint[],
): ExpiryRow[] {
  const spot = maxPain.spot;
  const byExpiry = new Map(quantiles.map((q) => [q.expiry, q]));
  return maxPain.points.map((p) => {
    const q = byExpiry.get(p.expiry);
    const em = q && q.p16 != null && q.p84 != null ? (q.p84 - q.p16) / 2 : null;
    return {
      expiry: p.expiry,
      dte: p.tte_years * DAYS_PER_YEAR,
      maxPain: p.max_pain,
      maxPainPct: p.max_pain != null && spot > 0 ? p.max_pain / spot - 1 : null,
      em,
      emPct: em != null && spot > 0 ? em / spot : null,
    };
  });
}
