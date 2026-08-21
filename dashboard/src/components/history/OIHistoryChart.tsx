import type { EChartsOption } from 'echarts';
import { useMemo } from 'react';
import { colors } from '../../theme/charts';
import { axisTooltip, grid, legendBar, timeAxisX, valueAxisY, values } from '../../theme/options';
import type { PositioningHistoryPoint, PositioningHistoryResponse } from '../../types';
import { countShort } from '../../utils/format';
import EChart from '../chart/EChart';

export function pcRatio(p: PositioningHistoryPoint): number | null {
  if (p.oi_total_calls == null || p.oi_total_puts == null || p.oi_total_calls <= 0) return null;
  return p.oi_total_puts / p.oi_total_calls;
}

export function buildOIHistoryOption(data: PositioningHistoryResponse): EChartsOption {
  return {
    backgroundColor: 'transparent',
    legend: legendBar(['Call OI', 'Put OI', 'P/C Ratio']),
    tooltip: axisTooltip({ value: countShort }),
    grid: grid('bars', { right: 64 }),
    xAxis: timeAxisX(),
    yAxis: [
      valueAxisY({ name: 'OI', format: countShort }),
      valueAxisY({
        name: 'P/C',
        accent: colors.ref,
        position: 'right',
        splitLine: false,
        format: (v: number) => v.toFixed(2),
      }),
    ],
    series: [
      {
        type: 'line',
        name: 'Call OI',
        showSymbol: false,
        areaStyle: { opacity: 0.15 },
        data: data.points.map((p) => [p.as_of, p.oi_total_calls]),
        itemStyle: { color: colors.call },
        lineStyle: { width: 1.5, color: colors.call },
        emphasis: { focus: 'series', lineStyle: { width: 3 } },
      },
      {
        type: 'line',
        name: 'Put OI',
        showSymbol: false,
        areaStyle: { opacity: 0.15 },
        data: data.points.map((p) => [p.as_of, p.oi_total_puts]),
        itemStyle: { color: colors.put },
        lineStyle: { width: 1.5, color: colors.put },
        emphasis: { focus: 'series', lineStyle: { width: 3 } },
      },
      {
        type: 'line',
        name: 'P/C Ratio',
        yAxisIndex: 1,
        showSymbol: false,
        data: data.points.map((p) => [p.as_of, pcRatio(p)]),
        itemStyle: { color: colors.ref },
        lineStyle: { width: 1.5, color: colors.ref, type: 'dashed' },
        emphasis: { focus: 'series', lineStyle: { width: 3 } },
        tooltip: { valueFormatter: values((v) => v.toFixed(2)) },
      },
    ],
  };
}

export default function OIHistoryChart({ data }: { data: PositioningHistoryResponse }) {
  return <EChart option={useMemo(() => buildOIHistoryOption(data), [data])} />;
}
