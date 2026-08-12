import type { EChartsOption } from 'echarts';
import { useMemo } from 'react';
import { ACCENT, FLIP, MAX_PAIN, MUTED } from '../../theme/charts';
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
        accent: MUTED,
        position: 'right',
        splitLine: false,
        format: usdShort,
      }),
    ],
    series: [
      level('spot', 'Spot', ACCENT, false),
      level('gex_flip', 'GEX Flip', FLIP, true),
      level('max_pain_front', 'Max Pain', MAX_PAIN, true),
      {
        type: 'bar',
        name: 'Net GEX',
        yAxisIndex: 1,
        barMaxWidth: 6,
        data: data.points.map((p) => [p.as_of, p.gex_net_total]),
        // context bars behind the level lines; gray so Max Pain keeps violet to itself
        itemStyle: { color: MUTED, opacity: 0.5 },
        emphasis: { focus: 'series' },
        tooltip: { valueFormatter: values(usdShort) },
      },
    ],
  };
}

export default function GEXLevelsHistoryChart({ data }: { data: PositioningHistoryResponse }) {
  return <EChart option={useMemo(() => buildGEXLevelsHistoryOption(data), [data])} />;
}
