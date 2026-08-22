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
} from '../../theme/options';
import type { VolumeByStrikeResponse } from '../../types';
import { countShort, strikeFmt } from '../../utils/format';
import { levelIdx } from '../../utils/strikes';
import EChart from '../chart/EChart';

const SERIES_NAMES = ['Call Volume', 'Put Volume'];

export function buildVolumeByStrikeOption(
  data: VolumeByStrikeResponse,
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
    yAxis: valueAxisY({ name: 'VOL 24H', format: countShort }),
    series: [
      {
        type: 'bar',
        name: 'Call Volume',
        barMaxWidth: 22,
        data: rows.map((p) => p.call_volume),
        itemStyle: { color: colors.call },
        emphasis: { focus: 'series' },
        ...(spotAt >= 0 && { markLine: markLine([spotMark(spotAt)]) }),
      },
      {
        type: 'bar',
        name: 'Put Volume',
        barMaxWidth: 22,
        data: rows.map((p) => p.put_volume),
        itemStyle: { color: colors.put },
        emphasis: { focus: 'series' },
      },
    ],
  };
}

export default function VolumeByStrikeChart({
  data,
  spot,
}: {
  data: VolumeByStrikeResponse;
  spot: number | null;
}) {
  return <EChart option={useMemo(() => buildVolumeByStrikeOption(data, spot), [data, spot])} />;
}
