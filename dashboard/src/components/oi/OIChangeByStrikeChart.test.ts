import { describe, it, expect } from 'vitest';

import { buildOIChangeByStrikeOption } from './OIChangeByStrikeChart';
import type { OIChangeByStrikeResponse } from '../../types';

const resp = (points: OIChangeByStrikeResponse['points']): OIChangeByStrikeResponse => ({
  currency: 'BTC',
  spot: 100,
  as_of: '2026-08-01T00:00:00Z',
  window: '24h',
  baseline_as_of: '2026-07-31T00:00:00Z',
  baseline_stale: false,
  expiries: [],
  expiry: null,
  points,
});

describe('buildOIChangeByStrikeOption', () => {
  it('plots call and put deltas as two bar series over strikes, low first', () => {
    const option = buildOIChangeByStrikeOption(
      resp([
        { strike: 110_000, call_oi_change: -3, put_oi_change: 1 },
        { strike: 90_000, call_oi_change: 5, put_oi_change: -2 },
      ]),
    );
    const series = option.series as { type: string; data: number[] }[];
    expect(series).toHaveLength(2);
    expect(series.every((s) => s.type === 'bar')).toBe(true);
    // sorted by strike: 90 first
    expect(series[0].data).toEqual([5, -3]);
    expect(series[1].data).toEqual([-2, 1]);
    expect((option.xAxis as { data: string[] }).data).toEqual(['90k', '110k']);
  });

  it('anchors a zero line for the signed deltas', () => {
    const option = buildOIChangeByStrikeOption(
      resp([{ strike: 100_000, call_oi_change: 1, put_oi_change: 0 }]),
    );
    const first = (option.series as { markLine?: { data: { yAxis: number }[] } }[])[0];
    expect(first.markLine?.data[0].yAxis).toBe(0);
  });
});
