import { describe, expect, it } from 'vitest';
import type { VolumeByStrikeResponse } from '../../types';
import { buildVolumeByStrikeOption } from './VolumeByStrikeChart';

const resp = (strikes: number[]): VolumeByStrikeResponse => ({
  currency: 'BTC',
  spot: 100,
  as_of: '2026-08-01T00:00:00Z',
  points: strikes.map((strike) => ({ strike, call_volume: 1, put_volume: 2 })),
});

describe('buildVolumeByStrikeOption', () => {
  it('plots call and put volume over strikes, low first', () => {
    const option = buildVolumeByStrikeOption(resp([110_000, 90_000]));
    expect((option.xAxis as { data: string[] }).data).toEqual(['90k', '110k']);
    expect((option.series as { data: number[] }[]).map((s) => s.data)).toEqual([
      [1, 1],
      [2, 2],
    ]);
  });

  it('marks spot on the first series at the nearest strike', () => {
    const option = buildVolumeByStrikeOption(resp([90_000, 100_000, 110_000]), 104_000);
    const series = option.series as { markLine?: { data: { xAxis: number }[] } }[];
    expect(series[0].markLine?.data[0].xAxis).toBe(1);
    expect(series[1].markLine).toBeUndefined();
  });

  it('marks no spot without one', () => {
    const option = buildVolumeByStrikeOption(resp([90_000, 100_000]));
    expect((option.series as { markLine?: unknown }[])[0].markLine).toBeUndefined();
  });
});
