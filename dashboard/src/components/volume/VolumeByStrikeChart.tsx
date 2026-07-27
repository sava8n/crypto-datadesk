import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';

import EChart from '../chart/EChart';
import type { VolumeByStrikeResponse } from '../../types';
import { countShort, strikeFmt } from '../../utils/format';
import { CALL, PUT } from '../../theme/charts';
import { axisTooltip, categoryAxisX, grid, legendBar, valueAxisY } from '../../theme/options';

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
        itemStyle: { color: CALL },
        emphasis: { focus: 'series' },
      },
      {
        type: 'bar',
        name: 'Put Volume',
        barMaxWidth: 22,
        data: rows.map((p) => p.put_volume),
        itemStyle: { color: PUT },
        emphasis: { focus: 'series' },
      },
    ],
  };
}

export default function VolumeByStrikeChart({ data }: { data: VolumeByStrikeResponse }) {
  return <EChart option={useMemo(() => buildVolumeByStrikeOption(data), [data])} />;
}
