import type { TermStructureResponse } from '../../types';
import { dteOf } from '../../utils/dte';

export interface BasisRow {
  dte: number;
  forward: number;
  /** F/S - 1 */
  basis: number;
  /** (F/S - 1) / T */
  basisAnn: number;
  expiry: string;
}

export function buildBasisRows(data: TermStructureResponse): BasisRow[] {
  if (data.spot <= 0) return [];
  return data.points
    .filter((p) => p.tte_years > 0)
    .map((p) => {
      const basis = p.forward / data.spot - 1;
      return {
        dte: dteOf(p),
        forward: p.forward,
        basis,
        basisAnn: basis / p.tte_years,
        expiry: p.expiry,
      };
    })
    .sort((a, b) => a.dte - b.dte);
}
