import type { EChartsOption } from 'echarts';
import { useMemo } from 'react';
import { colors } from '../../theme/charts';
import {
  axisTooltip,
  grid,
  legendBar,
  timeAxisX,
  timeZoom,
  valueAxisY,
  values,
} from '../../theme/options';
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
    // currency labels on the left axis need the deeper gutter
    grid: grid('history', { left: 68 }),
    xAxis: timeAxisX(),
    dataZoom: timeZoom({ left: 68 }),
    yAxis: [
      valueAxisY({ name: 'PRICE', scale: true, format: priceWhole }),
      valueAxisY({
        name: 'NET GEX',
        accent: colors.label,
        position: 'right',
        splitLine: false,
        format: usdShort,
      }),
    ],
    series: [
      level('spot', 'Spot', colors.text, false),
      level('gex_flip', 'GEX Flip', colors.levelKey, true),
      level('max_pain_front', 'Max Pain', colors.ref, true),
      {
        type: 'bar',
        name: 'Net GEX',
        yAxisIndex: 1,
        barMaxWidth: 6,
        data: data.points.map((p) => ({
          value: [p.as_of, p.gex_net_total],
          itemStyle: { color: (p.gex_net_total ?? 0) >= 0 ? colors.call : colors.put },
        })),
        itemStyle: { color: colors.label, opacity: 0.55 },
        emphasis: { focus: 'series' },
        tooltip: { valueFormatter: values(usdShort) },
      },
    ],
  };
}

export default function GEXLevelsHistoryChart({ data }: { data: PositioningHistoryResponse }) {
  return <EChart option={useMemo(() => buildGEXLevelsHistoryOption(data), [data])} />;
}
