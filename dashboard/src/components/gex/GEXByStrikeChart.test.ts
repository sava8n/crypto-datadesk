import { describe, it, expect } from 'vitest';
import type { LineSeriesOption } from 'echarts';

import { buildGEXByStrikeOption } from './GEXByStrikeChart';
import type { GEXByStrikeResponse } from '../../types';

const resp = (gex_flip: number | null, strikes: number[]): GEXByStrikeResponse => ({
  currency: 'BTC',
  spot: 100,
  as_of: '2026-07-26T00:00:00Z',
  gex_flip,
  points: strikes.map((strike) => ({ strike, call_gex: 1, put_gex: -1, net_gex: 0 })),
});

const markLineOf = (option: ReturnType<typeof buildGEXByStrikeOption>) => {
  const series = option.series as LineSeriesOption[];
  return series[2].markLine?.data ?? [];
};

describe('buildGEXByStrikeOption', () => {
  it('sorts strikes ascending regardless of input order', () => {
    const option = buildGEXByStrikeOption(resp(null, [120_000, 90_000, 100_000]));
    expect((option.xAxis as { data: string[] }).data).toEqual(['90k', '100k', '120k']);
  });

  it('marks the flip at the nearest quoted strike', () => {
    const data = markLineOf(buildGEXByStrikeOption(resp(101, [90, 100, 120])));
    expect(data).toHaveLength(1);
    expect((data[0] as { xAxis: number }).xAxis).toBe(1);
  });

  it('draws no flip line when the backend reports none', () => {
    expect(markLineOf(buildGEXByStrikeOption(resp(null, [90, 100])))).toEqual([]);
  });

  it('draws no flip line when there are no strikes to anchor it to', () => {
    expect(markLineOf(buildGEXByStrikeOption(resp(101, [])))).toEqual([]);
  });

  it('labels the flip with the level, not the index', () => {
    const data = markLineOf(buildGEXByStrikeOption(resp(101, [100])));
    const label = (data[0] as { label: { formatter: string } }).label;
    expect(label.formatter).toBe('Flip $101.00');
  });
});
