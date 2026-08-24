import { describe, expect, it } from 'vitest';
import type { PositioningHistoryPoint, PositioningHistoryResponse } from '../../types';
import { buildOIHistoryOption, pcRatio } from './OIHistoryChart';

const point = (
  asOf: string,
  calls: number | null,
  puts: number | null,
): PositioningHistoryPoint => ({
  as_of: asOf,
  spot: 63_000,
  oi_total_calls: calls,
  oi_total_puts: puts,
  gex_net_total: null,
  gex_flip: null,
  max_pain_front: null,
  oi_explained_fraction: null,
});

const resp = (points: PositioningHistoryPoint[]): PositioningHistoryResponse => ({
  currency: 'BTC',
  start: '2026-07-01T00:00:00Z',
  end: '2026-08-01T00:00:00Z',
  resolution: '1d',
  points,
});

describe('pcRatio', () => {
  it('divides puts by calls and refuses a missing or empty call side', () => {
    expect(pcRatio(point('t', 200, 100))).toBe(0.5);
    expect(pcRatio(point('t', 0, 100))).toBeNull();
    expect(pcRatio(point('t', null, 100))).toBeNull();
  });
});

describe('buildOIHistoryOption', () => {
  it('overlays spot on a hidden third axis behind the ratio', () => {
    const option = buildOIHistoryOption(resp([point('2026-07-30T00:00:00Z', 200, 100)]));
    const series = option.series as { name: string; yAxisIndex?: number }[];
    expect(series.map((s) => s.name)).toEqual(['Call OI', 'Put OI', 'P/C Ratio', 'Spot']);
    expect(series[3].yAxisIndex).toBe(2);
    const axes = option.yAxis as { show?: boolean; position?: string }[];
    expect(axes).toHaveLength(3);
    expect(axes[1].position).toBe('right');
    expect(axes[2].show).toBe(false);
  });
});
