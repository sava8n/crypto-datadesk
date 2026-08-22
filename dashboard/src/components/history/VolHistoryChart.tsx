import type { EChartsOption, LineSeriesOption } from 'echarts';
import { useMemo } from 'react';
import { colors } from '../../theme/charts';
import { axisTooltip, grid, legendBar, timeAxisX, timeZoom, valueAxisY } from '../../theme/options';
import type { VolHistoryPoint, VolHistoryResponse } from '../../types';
import { pctWhole, volPct } from '../../utils/format';
import EChart from '../chart/EChart';
import { SPOT_NAME, spotAxis, spotLine } from './spotOverlay';

interface Series {
  key: keyof VolHistoryPoint;
  name: string;
  color: string;
}

const SERIES_NAMES = ['IV30', 'RV30', 'IV7', 'RV7', 'DVOL'];

// named metrics keep fixed ramp slots, paired by tenor; a factory so the colours follow the theme
const series = (): Series[] => [
  { key: 'iv30', name: 'IV30', color: colors.s1 },
  { key: 'rv30', name: 'RV30', color: colors.s2 },
  { key: 'iv7', name: 'IV7', color: colors.s3 },
  { key: 'rv7', name: 'RV7', color: colors.s5 },
  { key: 'dvol', name: 'DVOL', color: colors.label },
];

export function buildVolHistoryOption(data: VolHistoryResponse): EChartsOption {
  const line = (s: Series): LineSeriesOption => ({
    type: 'line',
    name: s.name,
    showSymbol: false,
    // null breaks the line
    data: data.points.map((p) => [p.as_of, p[s.key] as number | null]),
    itemStyle: { color: s.color },
    lineStyle: { width: 1.5, color: s.color },
    emphasis: { focus: 'series', lineStyle: { width: 3 } },
  });

  return {
    backgroundColor: 'transparent',
    legend: legendBar([...SERIES_NAMES, SPOT_NAME]),
    tooltip: axisTooltip({ value: volPct }),
    grid: grid('history'),
    xAxis: timeAxisX(),
    yAxis: [valueAxisY({ name: 'VOL', scale: true, format: pctWhole }), spotAxis()],
    dataZoom: timeZoom(),
    series: [...series().map(line), spotLine(data.points, 1)],
  };
}

export default function VolHistoryChart({ data }: { data: VolHistoryResponse }) {
  return <EChart option={useMemo(() => buildVolHistoryOption(data), [data])} />;
}
