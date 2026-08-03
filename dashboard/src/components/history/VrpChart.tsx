import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';

import EChart from '../chart/EChart';
import { volPct } from '../../utils/format';
import { AMBER, CALL, DANGER, MUTED } from '../../theme/charts';
import { axisTooltip, grid, legendBar, timeAxisX, valueAxisY } from '../../theme/options';
import type { VRPRow } from './vrp';


export function buildVRPOption(rows: VRPRow[]): EChartsOption {
  const line = (name: string, pick: (r: VRPRow) => number, color: string, dashed = false) => ({
    type: 'line' as const,
    name,
    showSymbol: false,
    data: rows.map((r) => [r.asOf, pick(r)] as [string, number]),
    itemStyle: { color },
    lineStyle: { width: 1.5, color, ...(dashed && { type: 'dashed' as const }) },
    emphasis: { focus: 'series' as const, lineStyle: { width: 3 } },
  });

  return {
    backgroundColor: 'transparent',
    legend: legendBar(['IV30', 'RV30 +30D', 'VRP']),
    tooltip: axisTooltip({ value: volPct }),
    grid: grid('series'),
    xAxis: timeAxisX(),
    yAxis: valueAxisY({ name: 'VOL', scale: true, format: volPct }),
    series: [
      line('IV30', (r) => r.iv30, AMBER),
      line('RV30 +30D', (r) => r.rv30Fwd, DANGER, true),
      {
        ...line('VRP', (r) => r.vrp, CALL),
        // zero line: above = implied paid more than was realized
        markLine: {
          symbol: 'none',
          silent: true,
          lineStyle: { color: MUTED, type: 'dashed', width: 1.5 },
          label: { show: false },
          data: [{ yAxis: 0 }],
        },
      },
    ],
  };
}

export default function VRPChart({ rows }: { rows: VRPRow[] }) {
  return <EChart option={useMemo(() => buildVRPOption(rows), [rows])} />;
}
