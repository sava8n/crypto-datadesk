import type { EChartsOption } from 'echarts';
import { useMemo } from 'react';
import { C } from '../../theme/charts';
import { axisTooltip, grid, valueAxisX, valueAxisY, zeroLine } from '../../theme/options';
import type { TermStructureResponse } from '../../types';
import { dateLabel, dteLabel, usdFull, volPct } from '../../utils/format';
import EChart from '../chart/EChart';
import { buildBasisRows } from './basis';

export function buildBasisOption(data: TermStructureResponse): EChartsOption {
  const rows = buildBasisRows(data);

  return {
    backgroundColor: 'transparent',
    tooltip: axisTooltip({
      render: (p) => {
        const r = rows[p.dataIndex ?? -1];
        if (!r) return '';
        return `${dateLabel(r.expiry)}<br/>DTE ${dteLabel(r.dte)} · FWD ${usdFull(r.forward)}<br/>BASIS ${volPct(r.basis)} · ANN ${volPct(r.basisAnn)}`;
      },
    }),
    grid: grid('series'),
    xAxis: valueAxisX({ name: 'DTE', scale: true, min: 0, format: dteLabel }),
    yAxis: valueAxisY({ name: 'ANN', scale: true, format: volPct }),
    series: [
      {
        type: 'line',
        name: 'Annualized Basis',
        data: rows.map((r) => [r.dte, r.basisAnn]),
        showSymbol: true,
        symbolSize: 6,
        // basis has no side to it, so it takes the reference axis rather than a direction pair
        itemStyle: { color: C.ref },
        lineStyle: { width: 1.5, color: C.ref },
        emphasis: { focus: 'series', lineStyle: { width: 3 } },
        // above = contango (forwards over spot), below = backwardation
        markLine: zeroLine(),
      },
    ],
  };
}

export default function BasisChart({ data }: { data: TermStructureResponse }) {
  return <EChart option={useMemo(() => buildBasisOption(data), [data])} />;
}
