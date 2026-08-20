import type { CustomSeriesOption, LineSeriesOption } from 'echarts';

import type { CMBandPoint } from '../../types';

export interface BandRow {
  x: number;
  lo: number;
  mid: number;
  hi: number;
}

export type BandMetric = 'atm_iv' | 'rr25';

// keep tenors near the shown x-range so a 180d band cannot stretch a 0-30d chart
const RANGE_SLACK = 1.15;

export function bandRows(points: CMBandPoint[], metric: BandMetric, maxX: number): BandRow[] {
  return points
    .filter((p) => p.tenor_days <= maxX * RANGE_SLACK)
    .flatMap((p) => {
      const lo = p[`${metric}_p25`];
      const mid = p[`${metric}_p50`];
      const hi = p[`${metric}_p75`];
      if (lo == null || mid == null || hi == null) return [];
      return [{ x: p.tenor_days, lo, mid, hi }];
    })
    .sort((a, b) => a.x - b.x);
}

export type BandSeries = CustomSeriesOption | LineSeriesOption;

/**
 * A shaded p25-p75 ribbon and a dashed median, drawn as explicit polygons: DTE sits on a value
 * axis and echarts stacks only along a category axis - given [x, y] pairs it closes the area
 * against a baseline far off-canvas and paints a slab over the plot.
 */
export function bandSeries(rows: BandRow[], color: string): BandSeries[] {
  if (rows.length < 2) return [];
  const ribbon: CustomSeriesOption = {
    type: 'custom',
    name: 'BAND',
    silent: true,
    clip: true,
    tooltip: { show: false },
    data: rows.map((r) => [r.x, r.lo, r.hi]),
    // one quad per adjacent pair, so irregular tenor spacing stays honest
    renderItem: (params, api) => {
      const i = params.dataIndex;
      if (i === 0) return;
      const a = rows[i - 1];
      const b = rows[i];
      return {
        type: 'polygon',
        shape: {
          points: [
            api.coord([a.x, a.hi]),
            api.coord([b.x, b.hi]),
            api.coord([b.x, b.lo]),
            api.coord([a.x, a.lo]),
          ],
        },
        style: { fill: color, opacity: 0.1 },
      };
    },
  };
  const median: LineSeriesOption = {
    type: 'line',
    name: 'MEDIAN',
    silent: true,
    showSymbol: false,
    data: rows.map((r) => [r.x, r.mid]),
    lineStyle: { color, opacity: 0.5, width: 1, type: 'dashed' },
    itemStyle: { color, opacity: 0.5 },
    tooltip: { show: false },
  };
  return [ribbon, median];
}
