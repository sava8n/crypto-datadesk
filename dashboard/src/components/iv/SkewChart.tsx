import type { EChartsOption } from 'echarts';
import { useMemo } from 'react';
import { C } from '../../theme/charts';
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

  // shaded p25-p75 of the archived CM risk reversal, under the live curves. Neutral, so it
  // cannot be read as a side of its own. Empty when there is no archive to draw, which is why
  // the RR line's index has to be counted rather than assumed.
  const band = bandSeries(bandRows(bands, 'rr25', maxDte), C.label);

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
    // The risk reversal is call vol minus put vol, so it is a direction, not a level: above
    // zero the line takes the call side, below it the put side.
    //
    // Both pieces have to be bounded. An open-ended piece leaves echarts with no colour stop
    // inside the axis range when it builds the line's gradient, and it throws mid-render -
    // taking this series and every later one off the chart.
    visualMap: {
      show: false,
      seriesIndex: band.length,
      dimension: 1,
      pieces: [
        { gte: -rrSpan, lt: 0, color: C.put },
        { gte: 0, lte: rrSpan, color: C.call },
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
        // The visualMap paints the line itself, but the legend swatch reads the series colour -
        // and without one echarts hands it a slot from its own default palette, so the entry
        // came out green. Pin it to the call side, which is what a positive RR means.
        itemStyle: { color: C.call },
        lineStyle: { width: 1.5 },
        markLine: zeroLine(),
      },
      {
        type: 'line',
        name: 'BF 25Δ',
        data: rows.map((r) => [r.dte, r.bf]),
        showSymbol: true,
        symbolSize: 6,
        // the butterfly has no side to it, so it takes the reference hue
        itemStyle: { color: C.ref },
        lineStyle: { width: 1.5, color: C.ref },
        emphasis: { focus: 'series', lineStyle: { width: 3 } },
      },
    ],
  };
}

export default function SkewChart({ data, bands }: { data: SkewResponse; bands?: CMBandPoint[] }) {
  return <EChart option={useMemo(() => buildSkewOption(data, bands), [data, bands])} />;
}
