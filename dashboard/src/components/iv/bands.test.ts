import type { CustomSeriesOption } from 'echarts';
import { describe, expect, it } from 'vitest';
import type { CMBandPoint } from '../../types';
import { type BandSeries, bandRows, bandSeries } from './bands';

const band = (tenor: number, mid: number | null): CMBandPoint => ({
  tenor_days: tenor,
  atm_iv_p25: mid != null ? mid - 0.02 : null,
  atm_iv_p50: mid,
  atm_iv_p75: mid != null ? mid + 0.02 : null,
  rr25_p25: null,
  rr25_p50: null,
  rr25_p75: null,
  bf25_p25: null,
  bf25_p50: null,
  bf25_p75: null,
  count: 30,
});

describe('bandRows', () => {
  it('clips tenors far past the shown range and drops null percentiles', () => {
    const rows = bandRows(
      [band(7, 0.3), band(30, 0.32), band(60, null), band(180, 0.35)],
      'atm_iv',
      30,
    );
    expect(rows.map((r) => r.x)).toEqual([7, 30]);
    expect(rows[0].lo).toBeCloseTo(0.28);
    expect(rows[0].mid).toBeCloseTo(0.3);
    expect(rows[0].hi).toBeCloseTo(0.32);
  });

  it('reads the requested metric', () => {
    const point = { ...band(30, null), rr25_p25: -0.06, rr25_p50: -0.05, rr25_p75: -0.04 };
    const rows = bandRows([point], 'rr25', 30);
    expect(rows).toEqual([{ x: 30, lo: -0.06, mid: -0.05, hi: -0.04 }]);
  });
});

// identity coords, so a rendered quad comes back in data space rather than pixels
const fakeApi = { coord: (p: number[]) => p };
type Quad = { type: string; shape: { points: number[][] } } | undefined | null;
const renderQuad = (ribbon: BandSeries, dataIndex: number): Quad =>
  (ribbon as CustomSeriesOption).renderItem?.(
    { dataIndex } as never,
    fakeApi as never,
  ) as unknown as Quad;

describe('bandSeries', () => {
  it('draws the ribbon as quads spanning p25 to p75', () => {
    const series = bandSeries(bandRows([band(7, 0.3), band(30, 0.32)], 'atm_iv', 30), '#fff');
    expect(series).toHaveLength(2);
    const [ribbon, median] = series;
    expect(ribbon.type).toBe('custom');

    const quad = renderQuad(ribbon, 1);
    expect(quad?.type).toBe('polygon');
    const points = quad?.shape.points ?? [];
    expect(points.map((p) => p[0])).toEqual([7, 30, 30, 7]);
    // hi at both tenors, then back along lo - never a baseline off the chart
    for (const [i, want] of [0.32, 0.34, 0.3, 0.28].entries()) {
      expect(points[i][1]).toBeCloseTo(want);
    }
    expect((median.data as number[][])[1][1]).toBeCloseTo(0.32);
  });

  it('opens the ribbon at the second tenor, since a quad needs a pair', () => {
    const [ribbon] = bandSeries(bandRows([band(7, 0.3), band(30, 0.32)], 'atm_iv', 30), '#fff');
    expect(renderQuad(ribbon, 0)).toBeUndefined();
  });

  it('draws nothing from a single tenor', () => {
    expect(bandSeries(bandRows([band(30, 0.32)], 'atm_iv', 30), '#fff')).toEqual([]);
  });
});
