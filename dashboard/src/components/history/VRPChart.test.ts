import { describe, expect, it } from 'vitest';
import { buildVRPOption } from './VRPChart';
import type { VRPRow } from './vrp';

const row = (asOf: string, spot: number): VRPRow => ({
  asOf,
  spot,
  iv30: 0.5,
  rv30Fwd: 0.4,
  vrp: 0.1,
});

describe('buildVRPOption', () => {
  it('overlays spot on a right-hand axis beside the premium lines', () => {
    const option = buildVRPOption([
      row('2026-07-30T00:00:00Z', 61_000),
      row('2026-07-31T00:00:00Z', 62_000),
    ]);
    const series = option.series as { name: string; yAxisIndex?: number; data: unknown[] }[];
    expect(series.map((s) => s.name)).toEqual(['IV30', 'RV30 +30D', 'VRP', 'Spot']);
    expect(series[3].yAxisIndex).toBe(1);
    expect(series[3].data).toEqual([
      ['2026-07-30T00:00:00Z', 61_000],
      ['2026-07-31T00:00:00Z', 62_000],
    ]);
    expect(option.yAxis).toHaveLength(2);
  });
});
