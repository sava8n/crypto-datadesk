import { useMemo } from 'react';
import type {
  BarSeriesOption,
  EChartsOption,
  ScatterSeriesOption,
  YAXisComponentOption,
} from 'echarts';

import EChart from '../chart/EChart';
import type { OIByStrikeResponse } from '../../types';
import { countShort, strikeFmt, usdFull, usdShort } from '../../utils/format';
import { INTRINSIC, axisLabelStyle } from '../../theme/charts';
import {
  axisTooltip,
  categoryAxisX,
  grid,
  legendBar,
  valueAxisY,
  values,
} from '../../theme/options';
import { OI_SERIES, OI_SERIES_NAMES } from './series';

const INTRINSIC_NAME = 'Total Intrinsic Value';

export function buildOIByStrikeOption(data: OIByStrikeResponse): EChartsOption {
  // one grouped calls/puts bar per strike, low strikes first
  const rows = [...data.points].sort((a, b) => a.strike - b.strike);

  // intrinsic value and max pain are only defined for a single expiry
  const maxPain = data.max_pain;
  const maxPainIdx = maxPain != null ? rows.findIndex((p) => p.strike === maxPain) : -1;

  const yAxis: YAXisComponentOption[] = [valueAxisY({ name: 'OI', format: countShort })];
  const series: (BarSeriesOption | ScatterSeriesOption)[] = OI_SERIES.map((s) => ({
    type: 'bar',
    name: s.name,
    stack: s.stack,
    barMaxWidth: 22,
    data: rows.map((p) => p[s.key]),
    itemStyle: { color: s.color },
    emphasis: { focus: 'series' },
  }));

  if (maxPain != null) {
    yAxis.push(
      valueAxisY({
        name: 'INTRINSIC',
        format: usdShort,
        accent: INTRINSIC,
        position: 'right',
        splitLine: false,
      }),
    );
    series.push({
      type: 'scatter',
      name: INTRINSIC_NAME,
      yAxisIndex: 1,
      symbolSize: 6,
      // flat scalar array: index -> strike category, value -> intrinsic (USD)
      data: rows.map((p) => p.intrinsic_value ?? 0),
      itemStyle: { color: INTRINSIC },
      tooltip: { valueFormatter: values(usdShort) },
      markLine: {
        symbol: 'none',
        silent: true,
        lineStyle: { color: INTRINSIC, type: 'dashed', width: 1 },
        label: {
          ...axisLabelStyle,
          color: INTRINSIC,
          formatter: () => `Max Pain ${usdFull(maxPain)}`,
        },
        data: [{ xAxis: maxPainIdx }],
      },
    });
  }

  return {
    backgroundColor: 'transparent',
    legend: legendBar(
      maxPain != null ? [...OI_SERIES_NAMES, INTRINSIC_NAME] : [...OI_SERIES_NAMES],
    ),
    tooltip: axisTooltip({ shadow: true, value: countShort }),
    // the right-hand intrinsic axis needs a gutter of its own
    grid: grid('bars', maxPain != null ? { right: 64 } : {}),
    xAxis: categoryAxisX(rows.map((p) => strikeFmt(p.strike))),
    yAxis,
    series,
  };
}

export default function OIByStrikeChart({ data }: { data: OIByStrikeResponse }) {
  return <EChart option={useMemo(() => buildOIByStrikeOption(data), [data])} />;
}
