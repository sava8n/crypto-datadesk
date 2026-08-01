import { useMemo } from 'react';

import EChart3D from '../chart/EChart3D';
import type { ECharts3DOption, ViewControl } from '../../theme/gl';
import type { IVSurfaceResponse } from '../../types';
import { pctOne, pctWhole } from '../../utils/format';
import { buildSurfaceData, deltaLabel, expiryAt, ivAxisBounds } from './surface';
import {
  AMBER,
  AXIS_LINE,
  BLACK,
  GRID,
  axisLabelStyle,
  axisNameStyle,
  tooltipStyle,
} from '../../theme/charts';

// shared moneyness-axis samples each smile is resampled onto
const DELTA_GRID_POINTS = 31;

// clip the moneyness axis at 5-delta (|x| = 0.45): beyond it only sparse, noisy
// deep-wing quotes remain and flat extrapolation would stretch them into a fake skirt
const X_LIMIT = 0.45;

// opening camera; the wrapper applies it once and the user roams from there
const CAMERA: ViewControl = { alpha: 22, beta: 40, distance: 190, autoRotate: false };

// viridis colour stops (low -> high IV)
const VIRIDIS = [
  '#440154', '#482878', '#3e4a89', '#31688e', '#26828e',
  '#1f9e89', '#35b779', '#6ece58', '#b5de2b', '#fde725',
];

export function buildIVSurfaceOption(data: IVSurfaceResponse): ECharts3DOption {
  const { surfaceData, zMin, zMax, tteMin, tteMax } = buildSurfaceData(
    data.points,
    DELTA_GRID_POINTS,
    X_LIMIT,
  );

  const [zAxisMin, zAxisMax] = ivAxisBounds(zMin, zMax);
  const asOf = new Date(data.as_of).getTime();
  const expiryFmt = (tte: number) => expiryAt(asOf, tte);

  // large single-panel chart, so axis names two points above the shared style
  const nameStyle = { ...axisNameStyle, fontSize: 15 };

  return {
    backgroundColor: 'transparent',
    tooltip: {
      ...tooltipStyle,
      formatter: (p) => {
        const arr = (p as { value?: number[]; data?: number[] }).value ?? [];
        if (arr.length < 3) return '';
        const [x, t, iv] = arr;
        return `Δ ${deltaLabel(x)}<br/>T ${t.toFixed(3)}y<br/>IV ${pctOne(iv)}%`;
      },
    },
    visualMap: {
      type: 'continuous',
      show: true,
      dimension: 2,
      min: zAxisMin,
      max: zAxisMax,
      calculable: true,
      realtime: false,
      right: 14,
      top: 'center',
      itemHeight: 220,
      inRange: { color: VIRIDIS },
      textStyle: axisLabelStyle,
      formatter: (v) => pctWhole(Number(v)),
      text: ['IV', ''],
    },
    xAxis3D: {
      type: 'value',
      name: 'DELTA',
      nameGap: 24,
      nameTextStyle: nameStyle,
      min: -X_LIMIT,
      max: X_LIMIT,
      axisLabel: { ...axisLabelStyle, formatter: deltaLabel },
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
      axisLabel: { ...axisLabelStyle, formatter: pctWhole },
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
      light: {
        main: { intensity: 0.9, shadow: false, alpha: 30, beta: 40 },
        ambient: { intensity: 0.7 },
      },
    },
    series: [
      {
        type: 'surface',
        shading: 'lambert',
        wireframe: { show: false },
        data: surfaceData,
      },
    ],
  };
}

export default function IVSurfaceChart({ data }: { data: IVSurfaceResponse }) {
  return (
    <EChart3D option={useMemo(() => buildIVSurfaceOption(data), [data])} viewControl={CAMERA} />
  );
}
