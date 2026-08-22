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
  zeroLine,
} from '../../theme/options';
import { volPct } from '../../utils/format';
import EChart from '../chart/EChart';
import { SPOT_NAME, spotAxis, spotLine } from './spotOverlay';
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
    legend: legendBar(['IV30', 'RV30 +30D', 'VRP', SPOT_NAME]),
    tooltip: axisTooltip({ value: volPct }),
    grid: grid('history'),
    xAxis: timeAxisX(),
    yAxis: [valueAxisY({ name: 'VOL', scale: true, format: volPct }), spotAxis()],
    dataZoom: timeZoom(),
    series: [
      line('IV30', (r) => r.iv30, colors.ref),
      line('RV30 +30D', (r) => r.rv30Fwd, colors.s2, true),
      {
        ...line('VRP', (r) => r.vrp, colors.s3),
        // above = implied paid more than was realized
        markLine: zeroLine(),
      },
      spotLine(
        rows.map((r) => ({ as_of: r.asOf, spot: r.spot })),
        1,
      ),
    ],
  };
}

export default function VRPChart({ rows }: { rows: VRPRow[] }) {
  return <EChart option={useMemo(() => buildVRPOption(rows), [rows])} />;
}
