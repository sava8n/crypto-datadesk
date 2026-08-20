import type { EChartsOption } from 'echarts';
import { useMemo } from 'react';
import { C } from '../../theme/charts';
import { axisTooltip, grid, legendBar, timeAxisX, valueAxisY, zeroLine } from '../../theme/options';
import { volPct } from '../../utils/format';
import EChart from '../chart/EChart';
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
      // implied against realised has no side to it: the reference axis, violet then teal, and
      // a third slot for the spread itself
      line('IV30', (r) => r.iv30, C.ref),
      line('RV30 +30D', (r) => r.rv30Fwd, C.s2, true),
      {
        ...line('VRP', (r) => r.vrp, C.s3),
        // above = implied paid more than was realized
        markLine: zeroLine(),
      },
    ],
  };
}

export default function VRPChart({ rows }: { rows: VRPRow[] }) {
  return <EChart option={useMemo(() => buildVRPOption(rows), [rows])} />;
}
