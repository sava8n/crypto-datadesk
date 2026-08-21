import type { EChartsOption } from 'echarts';
import { useMemo } from 'react';
import { colors } from '../../theme/charts';
import {
  axisTooltip,
  categoryAxisX,
  grid,
  legendBar,
  valueAxisY,
  zeroLine,
} from '../../theme/options';
import type { OIChangeByStrikeResponse } from '../../types';
import { countShort, strikeFmt } from '../../utils/format';
import EChart from '../chart/EChart';

const SERIES_NAMES = ['Call ΔOI', 'Put ΔOI'];

export function buildOIChangeByStrikeOption(data: OIChangeByStrikeResponse): EChartsOption {
  const rows = [...data.points].sort((a, b) => a.strike - b.strike);

  return {
    backgroundColor: 'transparent',
    legend: legendBar(SERIES_NAMES),
    tooltip: axisTooltip({ shadow: true, value: countShort }),
    grid: grid('bars'),
    xAxis: categoryAxisX(rows.map((p) => strikeFmt(p.strike))),
    yAxis: valueAxisY({ name: 'ΔOI', format: countShort }),
    series: [
      {
        type: 'bar',
        name: 'Call ΔOI',
        barMaxWidth: 22,
        data: rows.map((p) => p.call_oi_change),
        itemStyle: { color: colors.call },
        emphasis: { focus: 'series' },
        markLine: zeroLine(),
      },
      {
        type: 'bar',
        name: 'Put ΔOI',
        barMaxWidth: 22,
        data: rows.map((p) => p.put_oi_change),
        itemStyle: { color: colors.put },
        emphasis: { focus: 'series' },
      },
    ],
  };
}

export default function OIChangeByStrikeChart({ data }: { data: OIChangeByStrikeResponse }) {
  return <EChart option={useMemo(() => buildOIChangeByStrikeOption(data), [data])} />;
}
