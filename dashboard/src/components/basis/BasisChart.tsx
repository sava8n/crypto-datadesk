import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';

import EChart from '../chart/EChart';
import type { TermStructureResponse } from '../../types';
import { dteLabel, dateLabel, usdFull, volPct } from '../../utils/format';
import { ACCENT, MUTED } from '../../theme/charts';
import { axisTooltip, grid, valueAxisX, valueAxisY } from '../../theme/options';
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
        itemStyle: { color: ACCENT },
        lineStyle: { width: 1.5, color: ACCENT },
        emphasis: { focus: 'series', lineStyle: { width: 3 } },
        // zero line: above = contango (forwards over spot), below = backwardation
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

export default function BasisChart({ data }: { data: TermStructureResponse }) {
  return <EChart option={useMemo(() => buildBasisOption(data), [data])} />;
}
