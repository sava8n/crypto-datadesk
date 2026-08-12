import { describe, expect, it } from 'vitest';
import type { VolHistoryPoint, VolHistoryResponse } from '../../types';
import { buildVolHistoryOption } from './VolHistoryChart';

const point = (asOf: string, iv30: number | null): VolHistoryPoint => ({
  as_of: asOf,
  spot: 63_000,
  iv7: 0.31,
  iv30,
  term_slope: 0.02,
  rv7: 0.29,
  rv30: 0.27,
  dvol: 0.35,
  rr25_7: -0.04,
  bf25_7: 0.008,
  rr25_30: -0.05,
  bf25_30: 0.01,
});

const resp = (points: VolHistoryPoint[]): VolHistoryResponse => ({
  currency: 'BTC',
  start: '2026-07-01T00:00:00Z',
  end: '2026-08-01T00:00:00Z',
  resolution: '1d',
  points,
});

describe('buildVolHistoryOption', () => {
  it('plots one time series per vol scalar', () => {
    const option = buildVolHistoryOption(
      resp([point('2026-07-30T00:00:00Z', 0.33), point('2026-07-31T00:00:00Z', 0.34)]),
    );
    const series = option.series as { name: string; data: [string, number | null][] }[];
    expect(series.map((s) => s.name)).toEqual(['IV30', 'RV30', 'IV7', 'RV7', 'DVOL']);
    expect(series[0].data).toEqual([
      ['2026-07-30T00:00:00Z', 0.33],
      ['2026-07-31T00:00:00Z', 0.34],
    ]);
  });

  it('keeps null observations as gaps rather than dropping the row', () => {
    const option = buildVolHistoryOption(
      resp([point('2026-07-30T00:00:00Z', null), point('2026-07-31T00:00:00Z', 0.34)]),
    );
    const iv30 = (option.series as { name: string; data: [string, number | null][] }[])[0];
    expect(iv30.data).toHaveLength(2);
    expect(iv30.data[0][1]).toBeNull();
  });
});
