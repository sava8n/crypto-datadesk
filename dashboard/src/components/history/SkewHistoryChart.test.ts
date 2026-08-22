import { describe, expect, it } from 'vitest';
import type { VolHistoryPoint, VolHistoryResponse } from '../../types';
import { buildSkewHistoryOption } from './SkewHistoryChart';

const point = (asOf: string, spot: number): VolHistoryPoint => ({
  as_of: asOf,
  spot,
  iv7: null,
  iv30: null,
  term_slope: null,
  rv7: null,
  rv30: null,
  dvol: null,
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

type Series = { name: string; yAxisIndex?: number; data: [string, number | null][] };

describe('buildSkewHistoryOption', () => {
  it('plots the skew scalars with spot on a right-hand axis', () => {
    const option = buildSkewHistoryOption(
      resp([point('2026-07-30T00:00:00Z', 61_000), point('2026-07-31T00:00:00Z', 62_000)]),
    );
    const series = option.series as Series[];
    expect(series.map((s) => s.name)).toEqual(['RR 25Δ 7D', 'RR 25Δ 30D', 'BF 25Δ 30D', 'Spot']);
    expect(series[3].yAxisIndex).toBe(1);
    expect(series[3].data).toEqual([
      ['2026-07-30T00:00:00Z', 61_000],
      ['2026-07-31T00:00:00Z', 62_000],
    ]);
    expect(option.yAxis).toHaveLength(2);
  });
});
