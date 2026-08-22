import type {
  BarSeriesOption,
  EChartsOption,
  ScatterSeriesOption,
  YAXisComponentOption,
} from 'echarts';
import { useMemo } from 'react';
import { axisLabelStyle, colors } from '../../theme/charts';
import {
  axisTooltip,
  categoryAxisX,
  grid,
  legendBar,
  markLine,
  spotMark,
  valueAxisY,
  values,
} from '../../theme/options';
import type { OIByStrikeResponse } from '../../types';
import { countShort, strikeFmt, usdFull, usdShort } from '../../utils/format';
import { levelIdx } from '../../utils/strikes';
import EChart from '../chart/EChart';
import { OI_SERIES_NAMES, oiSeries } from './series';

const INTRINSIC_NAME = 'Total Intrinsic Value';

export function buildOIByStrikeOption(
  data: OIByStrikeResponse,
  spot: number | null = null,
): EChartsOption {
  const rows = [...data.points].sort((a, b) => a.strike - b.strike);
  const spotAt = levelIdx(
    rows.map((p) => p.strike),
    spot,
  );

  // intrinsic value and max pain are only defined for a single expiry
  const maxPain = data.max_pain;
  const maxPainIdx = maxPain != null ? rows.findIndex((p) => p.strike === maxPain) : -1;

  const yAxis: YAXisComponentOption[] = [valueAxisY({ name: 'OI', format: countShort })];
  const series: (BarSeriesOption | ScatterSeriesOption)[] = oiSeries().map((s, i) => ({
    type: 'bar',
    name: s.name,
    stack: s.stack,
    barMaxWidth: 22,
    data: rows.map((p) => p[s.key]),
    itemStyle: { color: s.color },
    emphasis: { focus: 'series' },
    ...(i === 0 && spotAt >= 0 && { markLine: markLine([spotMark(spotAt)]) }),
  }));

  if (maxPain != null) {
    yAxis.push(
      valueAxisY({
        name: 'INTRINSIC',
        format: usdShort,
        accent: colors.levelKey,
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
      itemStyle: { color: colors.levelKey },
      // same focus as the bars, or this is the one legend entry that does nothing on hover
      emphasis: { focus: 'series' },
      tooltip: { valueFormatter: values(usdShort) },
      // the strike window can leave max pain outside the shown rows
      ...(maxPainIdx >= 0 && {
        markLine: {
          symbol: 'none',
          silent: true,
          lineStyle: { color: colors.levelKey, type: 'dashed' as const, width: 1 },
          label: {
            ...axisLabelStyle(),
            color: colors.levelKey,
            formatter: `Max Pain ${usdFull(maxPain)}`,
          },
          data: [{ xAxis: maxPainIdx }],
        },
      }),
    });
  }

  return {
    backgroundColor: 'transparent',
    legend: legendBar(
      maxPain != null ? [...OI_SERIES_NAMES, INTRINSIC_NAME] : [...OI_SERIES_NAMES],
    ),
    tooltip: axisTooltip({ shadow: true, value: countShort }),
    grid: grid('bars', maxPain != null ? { right: 64 } : {}),
    xAxis: categoryAxisX(rows.map((p) => strikeFmt(p.strike))),
    yAxis,
    series,
  };
}

export default function OIByStrikeChart({
  data,
  spot,
}: {
  data: OIByStrikeResponse;
  spot: number | null;
}) {
  return <EChart option={useMemo(() => buildOIByStrikeOption(data, spot), [data, spot])} />;
}
