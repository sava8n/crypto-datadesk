import { useMemo } from 'react';
import type { EChartsOption, LineSeriesOption, ScatterSeriesOption } from 'echarts';

import EChart from '../chart/EChart';
import type { RVConePoint, RVConeResponse, TermStructurePoint } from '../../types';
import { dteOf } from '../../utils/dte';
import { dteLabel, pctWhole, volPct } from '../../utils/format';
import { AMBER, AXIS_LINE, CALL, MUTED, TEXT } from '../../theme/charts';
import { axisTooltip, grid, legendBar, valueAxisX, valueAxisY } from '../../theme/options';

export interface RVConeChartData {
  cone: RVConeResponse;
  // current ATM IV term structure, overlaid at its own DTE - implied vs the RV cone
  implied: TermStructurePoint[];
}


const PERCENTILE_SERIES: { key: keyof RVConePoint; name: string; color: string }[] = [
  { key: 'p90', name: 'P90', color: AXIS_LINE },
  { key: 'p75', name: 'P75', color: MUTED },
  { key: 'p50', name: 'P50', color: TEXT },
  { key: 'p25', name: 'P25', color: MUTED },
  { key: 'p10', name: 'P10', color: AXIS_LINE },
];

export function buildRVConeOption({ cone, implied }: RVConeChartData): EChartsOption {
  const rows = [...cone.points].sort((a, b) => a.days - b.days);
  const maxDays = rows[rows.length - 1]?.days ?? 0;
  // clip the implied curve to the cone's horizon so both share one x range
  const impliedRows = implied
    .map((p) => ({ dte: dteOf(p), iv: p.atm_iv }))
    .filter((p) => p.dte <= maxDays * 1.1)
    .sort((a, b) => a.dte - b.dte);

  const percentiles: LineSeriesOption[] = PERCENTILE_SERIES.map((s) => ({
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
    itemStyle: { color: AMBER },
  };

  const series: (LineSeriesOption | ScatterSeriesOption)[] = [...percentiles, current];
  if (impliedRows.length >= 2) {
    series.push({
      type: 'line',
      name: 'IMPLIED',
      data: impliedRows.map((p) => [p.dte, p.iv]),
      showSymbol: true,
      symbolSize: 4,
      itemStyle: { color: CALL },
      lineStyle: { width: 1.5, color: CALL },
      emphasis: { focus: 'series', lineStyle: { width: 3 } },
    });
  }

  return {
    backgroundColor: 'transparent',
    legend: legendBar([...PERCENTILE_SERIES.map((s) => s.name), 'CURRENT RV', 'IMPLIED']),
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
