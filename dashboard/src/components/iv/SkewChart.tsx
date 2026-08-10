import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';

import EChart from '../chart/EChart';
import type { CMBandPoint, SkewResponse } from '../../types';
import { dteOf } from '../../utils/dte';
import { dteLabel, dateLabel, volPct } from '../../utils/format';
import { ACCENT, CYAN, MUTED } from '../../theme/charts';
import { axisTooltip, grid, legendBar, valueAxisX, valueAxisY } from '../../theme/options';
import { bandRows, bandSeries } from './bands';

const SERIES_NAMES = ['RR 25Δ', 'BF 25Δ'];

// RR/BF live in single vol points, so one decimal: 0.042 -> "4.2%"

export function buildSkewOption(data: SkewResponse, bands: CMBandPoint[] = []): EChartsOption {
  // one RR/BF pair per expiry, plotted time-proportionally by days-to-expiry
  const rows = data.points
    .map((p) => ({ dte: dteOf(p), rr: p.rr, bf: p.bf, expiry: p.expiry }))
    .sort((a, b) => a.dte - b.dte);
  const maxDte = rows[rows.length - 1]?.dte ?? 0;

  return {
    backgroundColor: 'transparent',
    legend: legendBar(SERIES_NAMES),
    tooltip: axisTooltip({
      render: (p) => {
        const r = rows[p.dataIndex ?? -1];
        if (!r) return '';
        return `${dateLabel(r.expiry)}<br/>DTE ${dteLabel(r.dte)}<br/>RR ${volPct(r.rr)} · BF ${volPct(r.bf)}`;
      },
    }),
    grid: grid('series'),
    xAxis: valueAxisX({ name: 'DTE', scale: true, min: 0, format: dteLabel }),
    yAxis: valueAxisY({ name: 'ΔIV', scale: true, format: volPct }),
    series: [
      // shaded p25-p75 of the archived CM risk reversal, under the live curves
      ...bandSeries(bandRows(bands, 'rr25', maxDte), ACCENT),
      {
        type: 'line',
        name: 'RR 25Δ',
        data: rows.map((r) => [r.dte, r.rr]),
        showSymbol: true,
        symbolSize: 6,
        itemStyle: { color: ACCENT },
        lineStyle: { width: 1.5, color: ACCENT },
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
        itemStyle: { color: CYAN },
        lineStyle: { width: 1.5, color: CYAN },
        emphasis: { focus: 'series', lineStyle: { width: 3 } },
      },
    ],
  };
}

export default function SkewChart({
  data,
  bands,
}: {
  data: SkewResponse;
  bands?: CMBandPoint[];
}) {
  return <EChart option={useMemo(() => buildSkewOption(data, bands), [data, bands])} />;
}
