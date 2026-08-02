import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';

import EChart from '../chart/EChart';
import type { PositioningHistoryPoint, PositioningHistoryResponse } from '../../types';
import { countShort } from '../../utils/format';
import { CALL, PUT, VIOLET } from '../../theme/charts';
import { axisTooltip, grid, legendBar, timeAxisX, valueAxisY, values } from '../../theme/options';

// put/call OI ratio; null while either side is unknown or the call side is empty
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
        accent: VIOLET,
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
        itemStyle: { color: CALL },
        lineStyle: { width: 1.5, color: CALL },
        emphasis: { focus: 'series', lineStyle: { width: 3 } },
      },
      {
        type: 'line',
        name: 'Put OI',
        showSymbol: false,
        areaStyle: { opacity: 0.15 },
        data: data.points.map((p) => [p.as_of, p.oi_total_puts]),
        itemStyle: { color: PUT },
        lineStyle: { width: 1.5, color: PUT },
        emphasis: { focus: 'series', lineStyle: { width: 3 } },
      },
      {
        type: 'line',
        name: 'P/C Ratio',
        yAxisIndex: 1,
        showSymbol: false,
        data: data.points.map((p) => [p.as_of, pcRatio(p)]),
        itemStyle: { color: VIOLET },
        lineStyle: { width: 1.5, color: VIOLET, type: 'dashed' },
        emphasis: { focus: 'series', lineStyle: { width: 3 } },
        tooltip: { valueFormatter: values((v) => v.toFixed(2)) },
      },
    ],
  };
}

export default function OIHistoryChart({ data }: { data: PositioningHistoryResponse }) {
  return <EChart option={useMemo(() => buildOIHistoryOption(data), [data])} />;
}
