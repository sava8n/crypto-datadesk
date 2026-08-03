// Per-expiry settlement/expected-move summary: max pain joined with the implied
// distribution's quantiles, both already served per expiry, plus the archived
// implied-vs-realized outcome for recently settled expiries.

import { DAYS_PER_YEAR } from '../../utils/constants';
import type { ExpiryOutcomePoint, MaxPainResponse, ProbQuantilePoint } from '../../types';

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

export interface SettledRow {
  expiry: string;
  // implied +-1 sigma as of ~1 day before settlement
  em: number | null;
  emPct: number | null;
  realized: number;
  realizedPct: number | null;
}

// newest-settled first, as served
export function buildSettledRows(outcomes: ExpiryOutcomePoint[]): SettledRow[] {
  return outcomes.map((o) => ({
    expiry: o.expiry,
    em: o.em_implied,
    emPct: o.em_implied != null && o.spot_ref > 0 ? o.em_implied / o.spot_ref : null,
    realized: o.realized_move,
    realizedPct: o.spot_ref > 0 ? o.realized_move / o.spot_ref : null,
  }));
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
