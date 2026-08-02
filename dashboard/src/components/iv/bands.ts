// CM percentile bands -> the stacked-line series that draw a shaded p25-p75 range
// with a dashed median, clipped to the x-range a chart is actually showing.

import type { LineSeriesOption } from 'echarts';

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

export function bandRows(
  points: CMBandPoint[],
  metric: BandMetric,
  maxX: number,
): BandRow[] {
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

/**
 * Three silent series: an invisible base line at p25, a stacked filler whose area
 * shades up to p75, and a dashed median. Callers spread them under the live series.
 */
export function bandSeries(rows: BandRow[], color: string): LineSeriesOption[] {
  if (rows.length < 2) return [];
  const base: LineSeriesOption = {
    type: 'line',
    name: 'BAND',
    silent: true,
    stack: 'cm-band',
    showSymbol: false,
    data: rows.map((r) => [r.x, r.lo]),
    lineStyle: { opacity: 0 },
    tooltip: { show: false },
  };
  const fill: LineSeriesOption = {
    ...base,
    data: rows.map((r) => [r.x, r.hi - r.lo]),
    areaStyle: { color, opacity: 0.1 },
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
  return [base, fill, median];
}
