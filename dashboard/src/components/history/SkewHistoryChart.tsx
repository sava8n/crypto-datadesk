import type { EChartsOption, LineSeriesOption } from 'echarts';
import { useMemo } from 'react';
import { ACCENT, CYAN, MUTED, PALETTE } from '../../theme/charts';
import { axisTooltip, grid, legendBar, timeAxisX, valueAxisY } from '../../theme/options';
import type { VolHistoryPoint, VolHistoryResponse } from '../../types';
import { volPct } from '../../utils/format';
import EChart from '../chart/EChart';

const SERIES: { key: keyof VolHistoryPoint; name: string; color: string }[] = [
  { key: 'rr25_7', name: 'RR 25Δ 7D', color: ACCENT },
  { key: 'rr25_30', name: 'RR 25Δ 30D', color: PALETTE[1] },
  { key: 'bf25_30', name: 'BF 25Δ 30D', color: CYAN },
];

export function buildSkewHistoryOption(data: VolHistoryResponse): EChartsOption {
  const line = (s: (typeof SERIES)[number], first: boolean): LineSeriesOption => ({
    type: 'line',
    name: s.name,
    showSymbol: false,
    data: data.points.map((p) => [p.as_of, p[s.key] as number | null]),
    itemStyle: { color: s.color },
    lineStyle: { width: 1.5, color: s.color },
    emphasis: { focus: 'series', lineStyle: { width: 3 } },
    // zero line: RR above = calls richer, below = puts richer
    ...(first && {
      markLine: {
        symbol: 'none',
        silent: true,
        lineStyle: { color: MUTED, type: 'dashed', width: 1.5 },
        label: { show: false },
        data: [{ yAxis: 0 }],
      },
    }),
  });

  return {
    backgroundColor: 'transparent',
    legend: legendBar(SERIES.map((s) => s.name)),
    tooltip: axisTooltip({ value: volPct }),
    grid: grid('series'),
    xAxis: timeAxisX(),
    yAxis: valueAxisY({ name: 'ΔIV', scale: true, format: volPct }),
    series: SERIES.map((s, i) => line(s, i === 0)),
  };
}

export default function SkewHistoryChart({ data }: { data: VolHistoryResponse }) {
  return <EChart option={useMemo(() => buildSkewHistoryOption(data), [data])} />;
}
