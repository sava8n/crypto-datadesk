import { describe, it, expect } from 'vitest';

import { buildRVConeOption, type RVConeChartData } from './RVConeChart';
import type { RVConePoint, TermStructurePoint } from '../../types';

const point = (days: number, current: number | null = 0.5): RVConePoint => ({
  days,
  p10: 0.2,
  p25: 0.3,
  p50: 0.4,
  p75: 0.5,
  p90: 0.6,
  current,
});

const data = (points: RVConePoint[], implied: TermStructurePoint[] = []): RVConeChartData => ({
  cone: { currency: 'BTC', spot: 100, as_of: '2026-08-01T00:00:00Z', points },
  implied,
});

const term = (tteYears: number, iv: number): TermStructurePoint => ({
  expiry: '2026-08-07T08:00:00Z',
  tte_years: tteYears,
  atm_iv: iv,
  forward: 100,
});

describe('buildRVConeOption', () => {
  it('draws five percentile lines and the current markers', () => {
    const option = buildRVConeOption(data([point(7), point(14), point(30)]));
    const series = option.series as { type: string; name: string }[];
    expect(series.filter((s) => s.type === 'line')).toHaveLength(5);
    const scatter = series.find((s) => s.type === 'scatter');
    expect(scatter?.name).toBe('CURRENT RV');
  });

  it('skips windows whose current RV is unknown', () => {
    const option = buildRVConeOption(data([point(7, null), point(14)]));
    const scatter = (option.series as { type: string; data: number[][] }[]).find(
      (s) => s.type === 'scatter',
    );
    expect(scatter?.data).toEqual([[14, 0.5]]);
  });

  it('overlays the implied curve clipped to the cone horizon', () => {
    // 7d and 30d implied points stay; ~365d is far past the 30d cone and is clipped
    const implied = [term(7 / 365.25, 0.55), term(30 / 365.25, 0.6), term(1.0, 0.7)];
    const option = buildRVConeOption(data([point(7), point(30)], implied));
    const line = (option.series as { name: string; data?: number[][] }[]).find(
      (s) => s.name === 'IMPLIED',
    );
    expect(line?.data).toHaveLength(2);
  });

  it('omits the implied overlay when the term structure is too thin', () => {
    const option = buildRVConeOption(data([point(7)], [term(7 / 365.25, 0.55)]));
    const names = (option.series as { name: string }[]).map((s) => s.name);
    expect(names).not.toContain('IMPLIED');
  });
});
