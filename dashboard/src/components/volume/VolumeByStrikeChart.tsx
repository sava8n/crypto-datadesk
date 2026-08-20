import type { EChartsOption } from 'echarts';
import { useMemo } from 'react';
import { C } from '../../theme/charts';
import { axisTooltip, categoryAxisX, grid, legendBar, valueAxisY } from '../../theme/options';
import type { VolumeByStrikeResponse } from '../../types';
import { countShort, strikeFmt } from '../../utils/format';
import EChart from '../chart/EChart';

const SERIES_NAMES = ['Call Volume', 'Put Volume'];

export function buildVolumeByStrikeOption(data: VolumeByStrikeResponse): EChartsOption {
  const rows = [...data.points].sort((a, b) => a.strike - b.strike);

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
        itemStyle: { color: C.call },
        emphasis: { focus: 'series' },
      },
      {
        type: 'bar',
        name: 'Put Volume',
        barMaxWidth: 22,
        data: rows.map((p) => p.put_volume),
        itemStyle: { color: C.put },
        emphasis: { focus: 'series' },
      },
    ],
  };
}

export default function VolumeByStrikeChart({ data }: { data: VolumeByStrikeResponse }) {
  return <EChart option={useMemo(() => buildVolumeByStrikeOption(data), [data])} />;
}
