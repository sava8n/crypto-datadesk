import type { EChartsOption } from 'echarts';
import { useMemo } from 'react';
import { colors } from '../../theme/charts';
import {
  axisTooltip,
  grid,
  legendBar,
  valueAxisX,
  valueAxisY,
  zeroLine,
} from '../../theme/options';
import type { CMBandPoint, SkewResponse } from '../../types';
import { dteOf } from '../../utils/dte';
import { dateLabel, dteLabel, volPct } from '../../utils/format';
import EChart from '../chart/EChart';
import { bandRows, bandSeries } from './bands';

const SERIES_NAMES = ['RR 25Δ', 'BF 25Δ'];

export function buildSkewOption(data: SkewResponse, bands: CMBandPoint[] = []): EChartsOption {
  const rows = data.points
    .map((p) => ({ dte: dteOf(p), rr: p.rr, bf: p.bf, expiry: p.expiry }))
    .sort((a, b) => a.dte - b.dte);
  const maxDte = rows[rows.length - 1]?.dte ?? 0;

  // archived CM risk-reversal band, neutral, under the live curves; empty without an archive,
  // which is why the RR series index is counted
  const band = bandSeries(bandRows(bands, 'rr25', maxDte), colors.label);

  // widest |RR| on the chart, so the two visualMap pieces between them cover every point
  const rrSpan = Math.max(1e-6, ...rows.map((r) => Math.abs(r.rr)));

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
    // RR is call vol minus put vol: call side above zero, put side below. Both pieces must be
    // bounded - an open-ended piece leaves no colour stop inside the axis range and echarts
    // throws mid-render, taking every later series with it.
    visualMap: {
      show: false,
      seriesIndex: band.length,
      dimension: 1,
      pieces: [
        { gte: -rrSpan, lt: 0, color: colors.put },
        { gte: 0, lte: rrSpan, color: colors.call },
      ],
    },
    xAxis: valueAxisX({ name: 'DTE', scale: true, min: 0, format: dteLabel }),
    yAxis: valueAxisY({ name: 'ΔIV', scale: true, format: volPct }),
    series: [
      ...band,
      {
        type: 'line',
        name: 'RR 25Δ',
        data: rows.map((r) => [r.dte, r.rr]),
        showSymbol: true,
        symbolSize: 6,
        emphasis: { focus: 'series', lineStyle: { width: 3 } },
        // the legend swatch reads the series colour, not the visualMap; without one echarts picks
        // from its default palette
        itemStyle: { color: colors.call },
        lineStyle: { width: 1.5 },
        markLine: zeroLine(),
      },
      {
        type: 'line',
        name: 'BF 25Δ',
        data: rows.map((r) => [r.dte, r.bf]),
        showSymbol: true,
        symbolSize: 6,
        itemStyle: { color: colors.ref },
        lineStyle: { width: 1.5, color: colors.ref },
        emphasis: { focus: 'series', lineStyle: { width: 3 } },
      },
    ],
  };
}

export default function SkewChart({ data, bands }: { data: SkewResponse; bands?: CMBandPoint[] }) {
  return <EChart option={useMemo(() => buildSkewOption(data, bands), [data, bands])} />;
}
