import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';

import EChart from '../chart/EChart';
import type { GEXByStrikeResponse } from '../../types';
import { strikeFmt, usdFull, usdShort } from '../../utils/format';
import { nearestIdx } from './nearest';
import { CALL, FLIP, NET_GEX, PUT, axisLabelStyle } from '../../theme/charts';
import { axisTooltip, categoryAxisX, grid, legendBar, valueAxisY } from '../../theme/options';

const SERIES_NAMES = ['Call GEX', 'Put GEX', 'Net GEX'];

export function buildGEXByStrikeOption(data: GEXByStrikeResponse): EChartsOption {
  const rows = [...data.points].sort((a, b) => a.strike - b.strike);
  const strikes = rows.map((p) => p.strike);

  const flip = data.gex_flip;
  const flipIdx = flip != null ? nearestIdx(strikes, flip) : -1;
  const hasFlip = flip != null && flipIdx >= 0;

  return {
    backgroundColor: 'transparent',
    legend: legendBar(SERIES_NAMES),
    tooltip: axisTooltip({ shadow: true, value: usdShort }),
    grid: grid('barsWide'),
    xAxis: categoryAxisX(strikes.map(strikeFmt)),
    yAxis: valueAxisY({ name: 'GEX / 1%', format: usdShort }),
    series: [
      {
        type: 'bar',
        name: 'Call GEX',
        stack: 'gex',
        barMaxWidth: 22,
        data: rows.map((p) => p.call_gex),
        itemStyle: { color: CALL },
        emphasis: { focus: 'series' },
      },
      {
        type: 'bar',
        name: 'Put GEX',
        stack: 'gex',
        barMaxWidth: 22,
        data: rows.map((p) => p.put_gex),
        itemStyle: { color: PUT },
        emphasis: { focus: 'series' },
      },
      {
        type: 'line',
        name: 'Net GEX',
        data: rows.map((p) => p.net_gex),
        showSymbol: false,
        smooth: true,
        itemStyle: { color: NET_GEX },
        lineStyle: { color: NET_GEX, width: 1.5 },
        emphasis: { focus: 'series' },
        markLine: {
          symbol: 'none',
          silent: true,
          data: hasFlip
            ? [
                {
                  xAxis: flipIdx,
                  lineStyle: { color: FLIP, type: 'dashed', width: 1 },
                  label: {
                    ...axisLabelStyle,
                    color: FLIP,
                    formatter: () => `Flip ${usdFull(flip)}`,
                  },
                },
              ]
            : [],
        },
      },
    ],
  };
}

export default function GEXByStrikeChart({ data }: { data: GEXByStrikeResponse }) {
  return <EChart option={useMemo(() => buildGEXByStrikeOption(data), [data])} />;
}
