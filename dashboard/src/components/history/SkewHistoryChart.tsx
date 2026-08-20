import type { EChartsOption, LineSeriesOption } from 'echarts';
import { useMemo } from 'react';
import { C } from '../../theme/charts';
import { axisTooltip, grid, legendBar, timeAxisX, valueAxisY, zeroLine } from '../../theme/options';
import type { VolHistoryPoint, VolHistoryResponse } from '../../types';
import { volPct } from '../../utils/format';
import EChart from '../chart/EChart';

interface Series {
  key: keyof VolHistoryPoint;
  name: string;
  color: string;
}

const SERIES_NAMES = ['RR 25Δ 7D', 'RR 25Δ 30D', 'BF 25Δ 30D'];

// Not the categorical ramp: a metric keeps its hue across the desk, so these match the 25Δ skew
// panel - the risk reversal (call vol minus put vol) takes the structural blue, the butterfly
// has no side to it and takes reference violet. The two RR tenors separate by weight rather
// than by hue, since they are one quantity read at two points on the curve.
// A factory, so the colours follow the theme.
const series = (): Series[] => [
  { key: 'rr25_7', name: 'RR 25Δ 7D', color: C.call },
  { key: 'rr25_30', name: 'RR 25Δ 30D', color: C.callSoft },
  { key: 'bf25_30', name: 'BF 25Δ 30D', color: C.ref },
];

export function buildSkewHistoryOption(data: VolHistoryResponse): EChartsOption {
  const line = (s: Series, first: boolean): LineSeriesOption => ({
    type: 'line',
    name: s.name,
    showSymbol: false,
    data: data.points.map((p) => [p.as_of, p[s.key] as number | null]),
    itemStyle: { color: s.color },
    lineStyle: { width: 1.5, color: s.color },
    emphasis: { focus: 'series', lineStyle: { width: 3 } },
    ...(first && { markLine: zeroLine() }),
  });

  return {
    backgroundColor: 'transparent',
    legend: legendBar(SERIES_NAMES),
    tooltip: axisTooltip({ value: volPct }),
    grid: grid('series'),
    xAxis: timeAxisX(),
    yAxis: valueAxisY({ name: 'ΔIV', scale: true, format: volPct }),
    series: series().map((s, i) => line(s, i === 0)),
  };
}

export default function SkewHistoryChart({ data }: { data: VolHistoryResponse }) {
  return <EChart option={useMemo(() => buildSkewHistoryOption(data), [data])} />;
}
