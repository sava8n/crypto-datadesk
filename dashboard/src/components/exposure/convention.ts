import type { ExposureConvention } from '../../types';
import { dateLabel, pctWhole } from '../../utils/format';

export interface ConventionCoverage {
  convention: ExposureConvention;
  tape_start: string | null;
  oi_explained_fraction: number | null;
}

export function conventionSubtitle(units: string, data?: ConventionCoverage): string {
  if (!data || data.convention === 'assumption') {
    return `${units} · CALLS + / PUTS - × STRIKE`;
  }
  if (data.tape_start == null) return `${units} · FLOW-SIGNED · EMPTY TAPE = ASSUMED`;
  const explained =
    data.oi_explained_fraction != null
      ? ` · ${pctWhole(data.oi_explained_fraction)} OI EXPLAINED`
      : '';
  return `${units} · FLOW-SIGNED · TAPE FROM ${dateLabel(data.tape_start)}${explained}`;
}
