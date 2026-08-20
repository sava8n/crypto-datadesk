import type { EChartsOption, LineSeriesOption, ScatterSeriesOption } from 'echarts';
import { useMemo } from 'react';
import { colors } from '../../theme/charts';
import { axisTooltip, grid, legendBar, valueAxisX, valueAxisY } from '../../theme/options';
import type { RVConePoint, RVConeResponse, TermStructurePoint } from '../../types';
import { dteOf } from '../../utils/dte';
import { dteLabel, pctWhole, volPct } from '../../utils/format';
import EChart from '../chart/EChart';

export interface RVConeChartData {
  cone: RVConeResponse;
  implied: TermStructurePoint[];
}

const PERCENTILE_NAMES = ['P90', 'P75', 'P50', 'P25', 'P10'];

// sequential ramp, one hue stepping toward the median; a factory so the colours follow the theme
const percentileSeries = (): { key: keyof RVConePoint; name: string; color: string }[] => [
  { key: 'p90', name: 'P90', color: colors.sequential[2] },
  { key: 'p75', name: 'P75', color: colors.sequential[3] },
  { key: 'p50', name: 'P50', color: colors.sequential[5] },
  { key: 'p25', name: 'P25', color: colors.sequential[3] },
  { key: 'p10', name: 'P10', color: colors.sequential[2] },
];

export function buildRVConeOption({ cone, implied }: RVConeChartData): EChartsOption {
  const rows = [...cone.points].sort((a, b) => a.days - b.days);
  const maxDays = rows[rows.length - 1]?.days ?? 0;
  // clip the implied curve to the cone's horizon so both share one x range
  const impliedRows = implied
    .map((p) => ({ dte: dteOf(p), iv: p.atm_iv }))
    .filter((p) => p.dte <= maxDays * 1.1)
    .sort((a, b) => a.dte - b.dte);

  const percentiles: LineSeriesOption[] = percentileSeries().map((s) => ({
    type: 'line',
    name: s.name,
    data: rows.map((r) => [r.days, r[s.key] as number]),
    showSymbol: true,
    symbolSize: 4,
    itemStyle: { color: s.color },
    lineStyle: { width: s.key === 'p50' ? 1.5 : 1, color: s.color },
    emphasis: { focus: 'series', lineStyle: { width: 3 } },
  }));

  const current: ScatterSeriesOption = {
    type: 'scatter',
    name: 'CURRENT RV',
    data: rows.filter((r) => r.current != null).map((r) => [r.days, r.current as number]),
    symbolSize: 9,
    itemStyle: { color: colors.warn },
  };

  const series: (LineSeriesOption | ScatterSeriesOption)[] = [...percentiles, current];
  if (impliedRows.length >= 2) {
    series.push({
      type: 'line',
      name: 'IMPLIED',
      data: impliedRows.map((p) => [p.dte, p.iv]),
      showSymbol: true,
      symbolSize: 4,
      itemStyle: { color: colors.ref },
      lineStyle: { width: 1.5, color: colors.ref },
      emphasis: { focus: 'series', lineStyle: { width: 3 } },
    });
  }

  return {
    backgroundColor: 'transparent',
    legend: legendBar([...PERCENTILE_NAMES, 'CURRENT RV', 'IMPLIED']),
    tooltip: axisTooltip({ value: volPct }),
    grid: grid('series'),
    xAxis: valueAxisX({ name: 'WINDOW', scale: true, min: 0, format: dteLabel }),
    yAxis: valueAxisY({ name: 'VOL', scale: true, format: pctWhole }),
    series,
  };
}

export default function RVConeChart({ data }: { data: RVConeChartData }) {
  return <EChart option={useMemo(() => buildRVConeOption(data), [data])} />;
}
