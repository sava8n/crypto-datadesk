import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';

import EChart from '../chart/EChart';
import type { SkewResponse } from '../../types';
import { DAYS_PER_YEAR } from '../../utils/constants';
import { dteLabel, expiryLabel, pctOne } from '../../utils/format';
import { AMBER, CALL, MUTED } from '../../theme/charts';
import { axisTooltip, grid, legendBar, valueAxisX, valueAxisY } from '../../theme/options';

const SERIES_NAMES = ['RR 25Δ', 'BF 25Δ'];

// RR/BF live in single vol points, so one decimal: 0.042 -> "4.2%"
const volPct = (v: number) => `${pctOne(v)}%`;

export function buildSkewOption(data: SkewResponse): EChartsOption {
  // one RR/BF pair per expiry, plotted time-proportionally by days-to-expiry
  const rows = data.points
    .map((p) => ({ dte: p.tte_years * DAYS_PER_YEAR, rr: p.rr, bf: p.bf, expiry: p.expiry }))
    .sort((a, b) => a.dte - b.dte);

  return {
    backgroundColor: 'transparent',
    legend: legendBar(SERIES_NAMES),
    tooltip: axisTooltip({
      render: (p) => {
        const r = rows[p.dataIndex ?? -1];
        if (!r) return '';
        return `${expiryLabel(r.expiry)}<br/>DTE ${dteLabel(r.dte)}<br/>RR ${volPct(r.rr)} · BF ${volPct(r.bf)}`;
      },
    }),
    grid: grid('series'),
    xAxis: valueAxisX({ name: 'DTE', scale: true, min: 0, format: dteLabel }),
    yAxis: valueAxisY({ name: 'ΔIV', scale: true, format: volPct }),
    series: [
      {
        type: 'line',
        name: 'RR 25Δ',
        data: rows.map((r) => [r.dte, r.rr]),
        showSymbol: true,
        symbolSize: 6,
        itemStyle: { color: AMBER },
        lineStyle: { width: 1.5, color: AMBER },
        emphasis: { focus: 'series', lineStyle: { width: 3 } },
        // zero line: RR above = calls richer, below = puts richer
        markLine: {
          symbol: 'none',
          silent: true,
          lineStyle: { color: MUTED, type: 'dashed', width: 1.5 },
          label: { show: false },
          data: [{ yAxis: 0 }],
        },
      },
      {
        type: 'line',
        name: 'BF 25Δ',
        data: rows.map((r) => [r.dte, r.bf]),
        showSymbol: true,
        symbolSize: 6,
        itemStyle: { color: CALL },
        lineStyle: { width: 1.5, color: CALL },
        emphasis: { focus: 'series', lineStyle: { width: 3 } },
      },
    ],
  };
}

export default function SkewChart({ data }: { data: SkewResponse }) {
  return <EChart option={useMemo(() => buildSkewOption(data), [data])} />;
}
