import { useMemo } from 'react';
import type { EChartsOption, LineSeriesOption } from 'echarts';

import EChart from '../chart/EChart';
import type { VolHistoryPoint, VolHistoryResponse } from '../../types';
import { pctWhole, volPct } from '../../utils/format';
import { ACCENT, DANGER, MUTED, PALETTE } from '../../theme/charts';
import { axisTooltip, grid, legendBar, timeAxisX, valueAxisY } from '../../theme/options';

// paired by tenor: each implied series sits next to the realized vol of the same horizon
const SERIES: { key: keyof VolHistoryPoint; name: string; color: string }[] = [
  { key: 'iv30', name: 'IV30', color: ACCENT },
  { key: 'rv30', name: 'RV30', color: DANGER },
  { key: 'iv7', name: 'IV7', color: PALETTE[1] },
  { key: 'rv7', name: 'RV7', color: PALETTE[10] },
  { key: 'dvol', name: 'DVOL', color: MUTED },
];

export function buildVolHistoryOption(data: VolHistoryResponse): EChartsOption {
  const line = (s: (typeof SERIES)[number]): LineSeriesOption => ({
    type: 'line',
    name: s.name,
    showSymbol: false,
    // null values break the line rather than draw through the gap
    data: data.points.map((p) => [p.as_of, p[s.key] as number | null]),
    itemStyle: { color: s.color },
    lineStyle: { width: 1.5, color: s.color },
    emphasis: { focus: 'series', lineStyle: { width: 3 } },
  });

  return {
    backgroundColor: 'transparent',
    legend: legendBar(SERIES.map((s) => s.name)),
    tooltip: axisTooltip({ value: volPct }),
    grid: grid('series'),
    xAxis: timeAxisX(),
    yAxis: valueAxisY({ name: 'VOL', scale: true, format: pctWhole }),
    series: SERIES.map(line),
  };
}

export default function VolHistoryChart({ data }: { data: VolHistoryResponse }) {
  return <EChart option={useMemo(() => buildVolHistoryOption(data), [data])} />;
}
