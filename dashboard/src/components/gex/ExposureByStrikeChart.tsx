import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';

import EChart from '../chart/EChart';
import type { ExposureResponse } from '../../types';
import { strikeFmt, usdShort } from '../../utils/format';
import { CALL, NET_GEX, PUT } from '../../theme/charts';
import { axisTooltip, categoryAxisX, grid, legendBar, valueAxisY } from '../../theme/options';

// dollar delta gained per 1 vol-pt rise (vanna) or per calendar day passing (charm)
const AXIS_NAMES = { vanna: 'VEX / VOL PT', charm: 'CEX / DAY' } as const;

export function buildExposureByStrikeOption(data: ExposureResponse): EChartsOption {
  const rows = [...data.points].sort((a, b) => a.strike - b.strike);

  return {
    backgroundColor: 'transparent',
    legend: legendBar(['Call', 'Put', 'Net']),
    tooltip: axisTooltip({ shadow: true, value: usdShort }),
    grid: grid('barsWide'),
    xAxis: categoryAxisX(rows.map((p) => strikeFmt(p.strike))),
    yAxis: valueAxisY({ name: AXIS_NAMES[data.greek], format: usdShort }),
    series: [
      {
        type: 'bar',
        name: 'Call',
        stack: 'exposure',
        barMaxWidth: 22,
        data: rows.map((p) => p.call_exposure),
        itemStyle: { color: CALL },
        emphasis: { focus: 'series' },
      },
      {
        type: 'bar',
        name: 'Put',
        stack: 'exposure',
        barMaxWidth: 22,
        data: rows.map((p) => p.put_exposure),
        itemStyle: { color: PUT },
        emphasis: { focus: 'series' },
      },
      {
        type: 'line',
        name: 'Net',
        data: rows.map((p) => p.net_exposure),
        showSymbol: false,
        smooth: true,
        itemStyle: { color: NET_GEX },
        lineStyle: { color: NET_GEX, width: 1.5 },
        emphasis: { focus: 'series' },
      },
    ],
  };
}

export default function ExposureByStrikeChart({ data }: { data: ExposureResponse }) {
  return <EChart option={useMemo(() => buildExposureByStrikeOption(data), [data])} />;
}
