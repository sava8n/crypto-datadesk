import { dateLabel, pctWhole } from '../../utils/format';

export interface TapeCoverage {
  tape_start: string | null;
  oi_explained_fraction: number | null;
}

export function coverageSubtitle(units: string, data?: TapeCoverage): string {
  if (!data || data.tape_start == null) return `${units} · TAPE-SIGNED · EMPTY TAPE`;
  const explained =
    data.oi_explained_fraction != null
      ? ` · ${pctWhole(data.oi_explained_fraction)} OI EXPLAINED`
      : '';
  return `${units} · TAPE FROM ${dateLabel(data.tape_start)}${explained}`;
}
