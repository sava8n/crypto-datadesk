import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

import type { SkewResponse } from '../../types';
import { expiryLabel } from '../../utils/format';
import {
  AMBER,
  AXIS_LINE,
  CALL,
  GRID,
  axisLabelStyle,
  axisNameStyle,
  tooltipStyle,
} from '../../theme/charts';

interface SkewRow {
  dte: number;
  rr: number;
  bf: number;
  expiry: string;
}

const ZERO = '#6c7a7a'; // zero reference

// RR/BF live in single vol points, so one decimal: 0.042 -> "4.2%"
const pct1 = (v: number) => `${(v * 100).toFixed(1)}%`;

export default function SkewPanel({ data }: { data: SkewResponse }) {
  const option = useMemo<EChartsOption>(() => {
    // one RR/BF pair per expiry, plotted time-proportionally by days-to-expiry
    const rows: SkewRow[] = data.points
      .map((p) => ({ dte: p.tte_years * 365.25, rr: p.rr, bf: p.bf, expiry: p.expiry }))
      .sort((a, b) => a.dte - b.dte);

    const opt = {
      backgroundColor: 'transparent',
      legend: {
        data: ['RR 25Δ', 'BF 25Δ'],
        top: 4,
        itemWidth: 10,
        itemHeight: 10,
        textStyle: axisLabelStyle,
      },
      tooltip: {
        ...tooltipStyle,
        trigger: 'axis',
        formatter: (params: { dataIndex?: number } | { dataIndex?: number }[]) => {
          const first = Array.isArray(params) ? params[0] : params;
          const r = rows[first?.dataIndex ?? -1];
          if (!r) return '';
          return `${expiryLabel(r.expiry)}<br/>DTE ${Math.round(r.dte)}d<br/>RR ${pct1(r.rr)} · BF ${pct1(r.bf)}`;
        },
      },
      grid: { left: 56, right: 18, top: 40, bottom: 44 },
      xAxis: {
        type: 'value',
        name: 'DTE',
        nameLocation: 'middle',
        nameGap: 28,
        nameTextStyle: axisNameStyle,
        scale: true,
        min: 0,
        axisLine: { lineStyle: { color: AXIS_LINE } },
        axisTick: { lineStyle: { color: AXIS_LINE } },
        axisLabel: { ...axisLabelStyle, formatter: (d: number) => `${Math.round(d)}d` },
        splitLine: { lineStyle: { color: GRID } },
      },
      yAxis: {
        type: 'value',
        name: 'ΔIV',
        nameGap: 12,
        nameTextStyle: axisNameStyle,
        scale: true,
        axisLine: { lineStyle: { color: AXIS_LINE } },
        axisTick: { lineStyle: { color: AXIS_LINE } },
        axisLabel: { ...axisLabelStyle, formatter: pct1 },
        splitLine: { lineStyle: { color: GRID } },
      },
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
            lineStyle: { color: ZERO, type: 'dashed', width: 1.5 },
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

    return opt as unknown as EChartsOption;
  }, [data]);

  return (
    <ReactECharts
      option={option}
      notMerge
      lazyUpdate
      style={{ width: '100%', height: '100%' }}
      opts={{ renderer: 'canvas' }}
    />
  );
}
