import type { EChartsOption } from 'echarts';
import { useMemo } from 'react';
import { C } from '../../theme/charts';
import { axisTooltip, grid, legendBar, timeAxisX, valueAxisY, values } from '../../theme/options';
import type { PositioningHistoryResponse } from '../../types';
import { priceWhole, usdShort } from '../../utils/format';
import EChart from '../chart/EChart';

export function buildGEXLevelsHistoryOption(data: PositioningHistoryResponse): EChartsOption {
  const level = (
    key: 'spot' | 'gex_flip' | 'max_pain_front',
    name: string,
    color: string,
    dashed: boolean,
  ) => ({
    type: 'line' as const,
    name,
    showSymbol: false,
    data: data.points.map((p) => [p.as_of, p[key]]),
    itemStyle: { color },
    lineStyle: { width: 1.5, color, ...(dashed && { type: 'dashed' as const }) },
    emphasis: { focus: 'series' as const, lineStyle: { width: 3 } },
    tooltip: { valueFormatter: values(priceWhole) },
  });

  return {
    backgroundColor: 'transparent',
    legend: legendBar(['Spot', 'GEX Flip', 'Max Pain', 'Net GEX']),
    tooltip: axisTooltip({}),
    grid: grid('barsWide', { right: 64 }),
    xAxis: timeAxisX(),
    yAxis: [
      valueAxisY({ name: 'PRICE', scale: true, format: priceWhole }),
      valueAxisY({
        name: 'NET GEX',
        accent: C.label,
        position: 'right',
        splitLine: false,
        format: usdShort,
      }),
    ],
    series: [
      // spot is the price anchor, not options structure, so it takes ink - the structural pair
      // is spoken for by the net-GEX bars behind it
      level('spot', 'Spot', C.text, false),
      level('gex_flip', 'GEX Flip', C.levelKey, true),
      level('max_pain_front', 'Max Pain', C.ref, true),
      {
        type: 'bar',
        name: 'Net GEX',
        yAxisIndex: 1,
        barMaxWidth: 6,
        // sign is all the hue carries: height against the NET GEX axis already carries magnitude
        data: data.points.map((p) => ({
          value: [p.as_of, p.gex_net_total],
          itemStyle: { color: (p.gex_net_total ?? 0) >= 0 ? C.call : C.put },
        })),
        // context behind the level lines, so the sign reads without competing with them
        itemStyle: { opacity: 0.55 },
        emphasis: { focus: 'series' },
        tooltip: { valueFormatter: values(usdShort) },
      },
    ],
  };
}

export default function GEXLevelsHistoryChart({ data }: { data: PositioningHistoryResponse }) {
  return <EChart option={useMemo(() => buildGEXLevelsHistoryOption(data), [data])} />;
}
