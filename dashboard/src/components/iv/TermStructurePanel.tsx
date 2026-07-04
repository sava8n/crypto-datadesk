import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

import type { TermStructureResponse } from '../../types';
import { expiryLabel } from '../../utils/format';

const AMBER = '#ffb000';
const GRID = '#243133';
const AXIS_LINE = '#3a4a4d';
const MONO = 'monospace';

interface TermPoint {
  dte: number;
  iv: number;
  expiry: string;
}

export default function TermStructurePanel({ data }: { data: TermStructureResponse }) {
  const option = useMemo<EChartsOption>(() => {
    // one ATM IV per expiry, plotted time-proportionally by days-to-expiry.
    const rows: TermPoint[] = data.points
      .map((p) => ({ dte: p.tte_years * 365.25, iv: p.atm_iv, expiry: p.expiry }))
      .sort((a, b) => a.dte - b.dte);

    const axisLabelStyle = { color: AMBER, fontFamily: MONO, fontSize: 11 };
    const nameStyle = { color: AMBER, fontFamily: MONO, fontSize: 13 };

    const ivFmt = (v: number) => `${Math.round(v * 100)}%`;

    const opt = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: '#0b0e10',
        borderColor: GRID,
        borderWidth: 1,
        textStyle: { color: AMBER, fontFamily: MONO, fontSize: 12 },
        formatter: (p: { dataIndex?: number }) => {
          const r = rows[p.dataIndex ?? -1];
          if (!r) return '';
          return `${expiryLabel(r.expiry)}<br/>DTE ${Math.round(r.dte)}d<br/>IV ${(r.iv * 100).toFixed(1)}%`;
        },
      },
      grid: { left: 56, right: 18, top: 40, bottom: 44 },
      xAxis: {
        type: 'value',
        name: 'DTE',
        nameLocation: 'middle',
        nameGap: 28,
        nameTextStyle: nameStyle,
        scale: true,
        min: 0,
        axisLine: { lineStyle: { color: AXIS_LINE } },
        axisTick: { lineStyle: { color: AXIS_LINE } },
        axisLabel: { ...axisLabelStyle, formatter: (d: number) => `${Math.round(d)}d` },
        splitLine: { lineStyle: { color: GRID } },
      },
      yAxis: {
        type: 'value',
        name: 'IV',
        nameGap: 12,
        nameTextStyle: nameStyle,
        scale: true,
        axisLine: { lineStyle: { color: AXIS_LINE } },
        axisTick: { lineStyle: { color: AXIS_LINE } },
        axisLabel: { ...axisLabelStyle, formatter: ivFmt },
        splitLine: { lineStyle: { color: GRID } },
      },
      series: [
        {
          type: 'line',
          name: 'ATM IV',
          data: rows.map((r) => [r.dte, r.iv]),
          showSymbol: true,
          symbolSize: 6,
          itemStyle: { color: AMBER },
          lineStyle: { width: 1.5, color: AMBER },
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
