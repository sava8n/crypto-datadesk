import type { TermStructureResponse } from '../../types';
import { DAYS_PER_YEAR } from '../../utils/constants';

export interface BasisRow {
  dte: number;
  forward: number;
  /** F/S - 1 */
  basis: number;
  /** (F/S - 1) / T */
  basisAnn: number;
  expiry: string;
}

// annualized basis of each per-expiry forward against spot, near-dated first
export function buildBasisRows(data: TermStructureResponse): BasisRow[] {
  if (data.spot <= 0) return [];
  return data.points
    .filter((p) => p.tte_years > 0)
    .map((p) => {
      const basis = p.forward / data.spot - 1;
      return {
        dte: p.tte_years * DAYS_PER_YEAR,
        forward: p.forward,
        basis,
        basisAnn: basis / p.tte_years,
        expiry: p.expiry,
      };
    })
    .sort((a, b) => a.dte - b.dte);
}
