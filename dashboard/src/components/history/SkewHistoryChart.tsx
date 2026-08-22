import type { EChartsOption, LineSeriesOption } from 'echarts';
import { useMemo } from 'react';
import { colors } from '../../theme/charts';
import {
  axisTooltip,
  grid,
  legendBar,
  timeAxisX,
  timeZoom,
  valueAxisY,
  zeroLine,
} from '../../theme/options';
import type { VolHistoryPoint, VolHistoryResponse } from '../../types';
import { volPct } from '../../utils/format';
import EChart from '../chart/EChart';
import { SPOT_NAME, spotAxis, spotLine } from './spotOverlay';

interface Series {
  key: keyof VolHistoryPoint;
  name: string;
  color: string;
}

const SERIES_NAMES = ['RR 25Δ 7D', 'RR 25Δ 30D', 'BF 25Δ 30D'];

// matches the skew panel: RR takes structural blue (tenors separate by weight), BF reference
// violet; a factory so the colours follow the theme
const series = (): Series[] => [
  { key: 'rr25_7', name: 'RR 25Δ 7D', color: colors.call },
  { key: 'rr25_30', name: 'RR 25Δ 30D', color: colors.callSoft },
  { key: 'bf25_30', name: 'BF 25Δ 30D', color: colors.ref },
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
    legend: legendBar([...SERIES_NAMES, SPOT_NAME]),
    tooltip: axisTooltip({ value: volPct }),
    grid: grid('history'),
    xAxis: timeAxisX(),
    yAxis: [valueAxisY({ name: 'ΔIV', scale: true, format: volPct }), spotAxis()],
    dataZoom: timeZoom(),
    series: [...series().map((s, i) => line(s, i === 0)), spotLine(data.points, 1)],
  };
}

export default function SkewHistoryChart({ data }: { data: VolHistoryResponse }) {
  return <EChart option={useMemo(() => buildSkewHistoryOption(data), [data])} />;
}
