import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import 'echarts-gl'; // registers the 3D `surface` series + grid3D/xAxis3D/... onto echarts

import type { IVSurfaceResponse } from '../../types';

const BLACK = '#000000';
const AMBER = '#ffb000';
const GRID = '#243133';
const AXIS_LINE = '#3a4a4d';
const MONO = 'monospace';

const DELTA_GRID_POINTS = 31; // shared moneyness-axis samples each smile is resampled onto

// clip the moneyness axis at 5-delta (|x| = 0.45): beyond it only sparse, noisy
// deep-wing quotes remain, and flat extrapolation would stretch them into a fake skirt
const X_LIMIT = 0.45;

// viridis colour stops (low -> high IV)
const VIRIDIS = [
  '#440154', '#482878', '#3e4a89', '#31688e', '#26828e',
  '#1f9e89', '#35b779', '#6ece58', '#b5de2b', '#fde725',
];

interface ExpiryRow {
  tte: number;
  xs: number[]; // moneyness coordinate
  ivs: number[];
}

// Strike-monotonic delta coordinate: ATM at 0, wings at the edges.
// Raw signed delta puts ATM at ±0.5 and both deep-OTM wings at 0, so an axis over it
// is non-monotonic in strike and interpolation bridges the two wings across the middle.
// Mapping puts (delta in [-0.5, 0)) to (-0.5, 0] and calls (delta in (0, 0.5]) to [0, 0.5)
// makes x ascend with strike: put wing left, ATM centered, call wing right.
const moneynessX = (delta: number, optionType: string): number =>
  optionType === 'P' ? -(0.5 + delta) : 0.5 - delta;

// linear interpolation with flat extrapolation past the ends (xs must be ascending)
function lerp(x: number, xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n === 0) return NaN;
  if (x <= xs[0]) return ys[0];
  if (x >= xs[n - 1]) return ys[n - 1];
  let i = 1;
  while (i < n && xs[i] < x) i += 1;
  const t = (x - xs[i - 1]) / (xs[i] - xs[i - 1]);
  return ys[i - 1] + t * (ys[i] - ys[i - 1]);
}

export default function IVSurfacePanel({ data }: { data: IVSurfaceResponse }) {
  const option = useMemo<EChartsOption>(() => {
    // group quotes by expiry, then resample each expiry's smile onto a shared
    // moneyness grid so the surface is a smooth regular mesh instead of scattered points
    const byExpiry = new Map<string, ExpiryRow>();
    for (const p of data.points) {
      let row = byExpiry.get(p.expiry);
      if (!row) {
        row = { tte: p.tte_years, xs: [], ivs: [] };
        byExpiry.set(p.expiry, row);
      }
      row.xs.push(moneynessX(p.delta, p.option_type));
      row.ivs.push(p.mark_iv);
    }
    const expiries = [...byExpiry.values()].sort((a, b) => a.tte - b.tte);

    // data extent of the expiry axis, so the front wall is the first expiry (not tte=0)
    const tteMin = expiries.length ? expiries[0].tte : undefined;
    const tteMax = expiries.length ? expiries[expiries.length - 1].tte : undefined;

    const xSamples = Array.from(
      { length: DELTA_GRID_POINTS },
      (_, i) => -X_LIMIT + (2 * X_LIMIT * i) / (DELTA_GRID_POINTS - 1),
    );

    // echarts-gl surface data is a flat list of [x, y, z] over a full rectangular grid
    const surfaceData: number[][] = [];
    let zMin = Infinity;
    let zMax = -Infinity;
    for (const row of expiries) {
      const order = row.xs.map((_, i) => i).sort((a, b) => row.xs[a] - row.xs[b]);
      const xs: number[] = [];
      const ys: number[] = [];
      for (const idx of order) {
        const x = row.xs[idx];
        const v = row.ivs[idx];
        if (xs.length && Math.abs(x - xs[xs.length - 1]) < 1e-9) {
          ys[ys.length - 1] = (ys[ys.length - 1] + v) / 2;
        } else {
          xs.push(x);
          ys.push(v);
        }
      }
      for (const x of xSamples) {
        const iv = lerp(x, xs, ys);
        if (iv < zMin) zMin = iv;
        if (iv > zMax) zMax = iv;
        surfaceData.push([x, row.tte, iv]);
      }
    }
    if (!Number.isFinite(zMin)) {
      zMin = 0;
      zMax = 1;
    }

    // tight IV axis (rounded to 5%) so the surface fills the box vertically instead of
    // being squashed against a 0%-anchored axis
    const zAxisMin = Math.floor(zMin / 0.05) * 0.05;
    const zAxisMax = Math.ceil(zMax / 0.05) * 0.05;

    // expiry ticks: convert a tte value back to a calendar date via as_of, so any tick
    // echarts places gets a correct label (no need for fixed tick positions)
    const asOf = new Date(data.as_of).getTime();
    
    // invert moneynessX for labels: delta magnitude at coordinate x is 0.5 - |x|,
    // so 0 -> "ATM", -0.25 -> "25p" (25-delta put), +0.4 -> "10c"
    const deltaFmt = (v: number) => {
      const pct = Math.round((0.5 - Math.abs(v)) * 100);
      if (pct >= 50) return 'ATM';
      return v < 0 ? `${pct}p` : `${pct}c`;
    };
    const expiryFmt = (tte: number) =>
      new Date(asOf + tte * 365.25 * 86400 * 1000).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: '2-digit',
      });
    const ivFmt = (v: number) => `${Math.round(v * 100)}%`;

    const axisLabelStyle = { color: AMBER, fontFamily: MONO, fontSize: 11 };
    const nameStyle = { color: AMBER, fontFamily: MONO, fontSize: 15 };

    const opt = {
      backgroundColor: 'transparent',
      tooltip: {
        backgroundColor: '#0b0e10',
        borderColor: GRID,
        borderWidth: 1,
        textStyle: { color: AMBER, fontFamily: MONO, fontSize: 12 },
        formatter: (p: { value?: number[]; data?: number[] }) => {
          const arr = p.value ?? p.data ?? [];
          if (arr.length < 3) return '';
          const [x, t, iv] = arr;
          return `Δ ${deltaFmt(x)}<br/>T ${t.toFixed(3)}y<br/>IV ${(iv * 100).toFixed(1)}%`;
        },
      },
      visualMap: {
        type: 'continuous',
        show: true,
        dimension: 2,
        min: zMin,
        max: zMax,
        calculable: true,
        realtime: false,
        right: 14,
        top: 'center',
        itemHeight: 220,
        inRange: { color: VIRIDIS },
        textStyle: { color: AMBER, fontFamily: MONO, fontSize: 11 },
        formatter: (v: number) => `${Math.round(v * 100)}%`,
        text: ['IV', ''],
      },
      xAxis3D: {
        type: 'value',
        name: 'DELTA',
        nameGap: 24,
        nameTextStyle: nameStyle,
        min: -X_LIMIT,
        max: X_LIMIT,
        axisLabel: { ...axisLabelStyle, formatter: deltaFmt },
      },
      yAxis3D: {
        type: 'value',
        name: 'EXPIRY',
        nameGap: 32,
        nameTextStyle: nameStyle,
        min: tteMin,
        max: tteMax,
        axisLabel: { ...axisLabelStyle, formatter: expiryFmt },
      },
      zAxis3D: {
        type: 'value',
        name: 'IV',
        nameGap: 20,
        nameTextStyle: nameStyle,
        min: zAxisMin,
        max: zAxisMax,
        axisLabel: { ...axisLabelStyle, formatter: ivFmt },
      },
      grid3D: {
        boxWidth: 100,
        boxDepth: 80,
        boxHeight: 75,
        environment: BLACK,
        axisLine: { lineStyle: { color: AXIS_LINE } },
        axisTick: { lineStyle: { color: AXIS_LINE } },
        splitLine: { lineStyle: { color: GRID } },
        axisPointer: { show: true, lineStyle: { color: AMBER } },
        viewControl: { alpha: 22, beta: 40, distance: 190, autoRotate: false },
        light: {
          main: { intensity: 0.9, shadow: false, alpha: 30, beta: 40 },
          ambient: { intensity: 0.7 },
        },
      },
      series: [
        {
          type: 'surface',
          // lambert = diffuse lighting, so slopes get depth shading
          shading: 'lambert',
          wireframe: { show: false },
          data: surfaceData,
        },
      ],
    };

    return opt as unknown as EChartsOption;
  }, [data]);

  return (
    <ReactECharts
      option={option}
      notMerge={false}
      lazyUpdate
      style={{ width: '100%', height: '100%' }}
      opts={{ renderer: 'canvas' }}
    />
  );
}
