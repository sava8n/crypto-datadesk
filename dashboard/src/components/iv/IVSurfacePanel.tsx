import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import 'echarts-gl'; // registers the 3D `surface` series + grid3D/xAxis3D/... onto echarts

import type { IVSurfaceResponse } from '../../types';
import { ivFmt } from '../../utils/format';
import { buildSurfaceData } from './surface';
import {
  AMBER,
  AXIS_LINE,
  GRID,
  axisLabelStyle,
  axisNameStyle,
  tooltipStyle,
} from '../../theme/charts';

const BLACK = '#000000';

// shared moneyness-axis samples each smile is resampled onto
const DELTA_GRID_POINTS = 31;

// clip the moneyness axis at 5-delta (|x| = 0.45): beyond it only sparse, noisy
// deep-wing quotes remain, and flat extrapolation would stretch them into a fake skirt
const X_LIMIT = 0.45;

// viridis colour stops (low -> high IV)
const VIRIDIS = [
  '#440154', '#482878', '#3e4a89', '#31688e', '#26828e',
  '#1f9e89', '#35b779', '#6ece58', '#b5de2b', '#fde725',
];

export default function IVSurfacePanel({ data }: { data: IVSurfaceResponse }) {
  const option = useMemo<EChartsOption>(() => {
    // resample each expiry's smile onto a shared moneyness grid so the surface is a
    // smooth regular mesh instead of scattered points
    const { surfaceData, zMin, zMax, tteMin, tteMax } = buildSurfaceData(
      data.points,
      DELTA_GRID_POINTS,
      X_LIMIT,
    );

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
    // large single-panel chart, so axis names two points above the shared style
    const nameStyle = { ...axisNameStyle, fontSize: 15 };

    const opt = {
      backgroundColor: 'transparent',
      tooltip: {
        ...tooltipStyle,
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
        textStyle: axisLabelStyle,
        formatter: ivFmt,
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
