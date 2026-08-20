import type { EChartsOption, LineSeriesOption } from 'echarts';
import { useMemo } from 'react';
import { C } from '../../theme/charts';
import { axisTooltip, grid, legendBar, timeAxisX, valueAxisY } from '../../theme/options';
import type { VolHistoryPoint, VolHistoryResponse } from '../../types';
import { pctWhole, volPct } from '../../utils/format';
import EChart from '../chart/EChart';

interface Series {
  key: keyof VolHistoryPoint;
  name: string;
  color: string;
}

const SERIES_NAMES = ['IV30', 'RV30', 'IV7', 'RV7', 'DVOL'];

// Named metrics rather than expiries, so each keeps a fixed ramp slot, paired by tenor.
// A factory, so the colours follow the theme.
const series = (): Series[] => [
  { key: 'iv30', name: 'IV30', color: C.s1 },
  { key: 'rv30', name: 'RV30', color: C.s2 },
  { key: 'iv7', name: 'IV7', color: C.s3 },
  { key: 'rv7', name: 'RV7', color: C.s5 },
  { key: 'dvol', name: 'DVOL', color: C.label },
];

export function buildVolHistoryOption(data: VolHistoryResponse): EChartsOption {
  const line = (s: Series): LineSeriesOption => ({
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
    legend: legendBar(SERIES_NAMES),
    tooltip: axisTooltip({ value: volPct }),
    grid: grid('series'),
    xAxis: timeAxisX(),
    yAxis: valueAxisY({ name: 'VOL', scale: true, format: pctWhole }),
    series: series().map(line),
  };
}

export default function VolHistoryChart({ data }: { data: VolHistoryResponse }) {
  return <EChart option={useMemo(() => buildVolHistoryOption(data), [data])} />;
}
