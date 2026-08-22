import type { EChartsOption } from 'echarts';
import { useMemo } from 'react';
import { colors } from '../../theme/charts';
import {
  axisTooltip,
  categoryAxisX,
  grid,
  legendBar,
  markLine,
  spotMark,
  valueAxisY,
  zeroMark,
} from '../../theme/options';
import type { OIChangeByStrikeResponse } from '../../types';
import { countShort, strikeFmt } from '../../utils/format';
import { levelIdx } from '../../utils/strikes';
import EChart from '../chart/EChart';

const SERIES_NAMES = ['Call ΔOI', 'Put ΔOI'];

export function buildOIChangeByStrikeOption(
  data: OIChangeByStrikeResponse,
  spot: number | null = null,
): EChartsOption {
  const rows = [...data.points].sort((a, b) => a.strike - b.strike);
  const spotAt = levelIdx(
    rows.map((p) => p.strike),
    spot,
  );

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
        markLine: markLine([zeroMark(), ...(spotAt >= 0 ? [spotMark(spotAt)] : [])]),
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

export default function OIChangeByStrikeChart({
  data,
  spot,
}: {
  data: OIChangeByStrikeResponse;
  spot: number | null;
}) {
  return <EChart option={useMemo(() => buildOIChangeByStrikeOption(data, spot), [data, spot])} />;
}
