import { describe, expect, it } from 'vitest';
import type { OIByStrikeResponse } from '../../types';
import { buildOIByStrikeOption } from './OIByStrikeChart';

const resp = (maxPain: number | null, strikes: number[]): OIByStrikeResponse => ({
  currency: 'BTC',
  spot: 100,
  as_of: '2026-07-26T00:00:00Z',
  expiries: [],
  expiry: maxPain != null ? '2026-07-31T08:00:00Z' : null,
  max_pain: maxPain,
  points: strikes.map((strike) => ({
    strike,
    itm_calls: 1,
    otm_calls: 2,
    itm_puts: 3,
    otm_puts: 4,
    intrinsic_value: maxPain != null ? strike : null,
  })),
});

describe('buildOIByStrikeOption', () => {
  it('stacks the four moneyness buckets across two stacks', () => {
    const option = buildOIByStrikeOption(resp(null, [100]));
    expect(option.series).toHaveLength(4);
    expect((option.series as { stack: string }[]).map((s) => s.stack)).toEqual([
      'calls',
      'calls',
      'puts',
      'puts',
    ]);
  });

  it('omits the intrinsic axis and series when the chain spans all expiries', () => {
    const option = buildOIByStrikeOption(resp(null, [90, 100]));
    expect(option.yAxis).toHaveLength(1);
    expect(option.series).toHaveLength(4);
    expect(option.grid).toMatchObject({ right: 18 });
  });

  it('adds the intrinsic axis, series and gutter for a single expiry', () => {
    const option = buildOIByStrikeOption(resp(100, [90, 100]));
    expect(option.yAxis).toHaveLength(2);
    expect(option.series).toHaveLength(5);
    expect(option.grid).toMatchObject({ right: 64 });
  });

  it('anchors the max-pain line at the matching strike index', () => {
    const option = buildOIByStrikeOption(resp(110, [90, 100, 110]));
    const scatter = (option.series as { markLine?: { data: { xAxis: number }[] } }[])[4];
    expect(scatter.markLine?.data[0].xAxis).toBe(2);
  });

  it('labels max pain with the price', () => {
    const option = buildOIByStrikeOption(resp(110, [110]));
    const scatter = (option.series as { markLine?: { label: { formatter: string } } }[])[4];
    expect(scatter.markLine?.label.formatter).toBe('Max Pain $110.00');
  });

  it('substitutes zero for a missing intrinsic value rather than dropping the bar', () => {
    const data = resp(100, [90, 100]);
    data.points[0].intrinsic_value = null;
    const option = buildOIByStrikeOption(data);
    expect((option.series as { data: number[] }[])[4].data).toEqual([0, 100]);
  });
});
