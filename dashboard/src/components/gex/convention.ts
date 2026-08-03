import type { GexConvention } from '../../types';
import { expiryLabel, pctWhole } from '../../utils/format';

export interface ConventionCoverage {
  convention: GexConvention;
  tape_start: string | null;
  oi_explained_fraction: number | null;
}

// panel subtitle for the sign convention actually served
export function conventionSubtitle(units: string, data?: ConventionCoverage): string {
  if (!data || data.convention === 'assumption') {
    return `${units} · CALLS + / PUTS - × STRIKE`;
  }
  if (data.tape_start == null) return `${units} · FLOW-SIGNED · EMPTY TAPE = ASSUMED`;
  const explained =
    data.oi_explained_fraction != null
      ? ` · ${pctWhole(data.oi_explained_fraction)} OI EXPLAINED`
      : '';
  return `${units} · FLOW-SIGNED · TAPE FROM ${expiryLabel(data.tape_start)}${explained}`;
}
