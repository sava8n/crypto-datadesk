import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

import type { IVCurvesResponse } from '../../types';
import { expiryLabel, strikeFmt } from '../../utils/format';

const AMBER = '#ffb000';
const GRID = '#243133';
const AXIS_LINE = '#3a4a4d';
const TEXT = '#c8d0d0';
const MONO = 'monospace';

const PALETTE = [
  '#ffb000', '#4aa3ff', '#33ff66', '#ff6b6b', '#b388ff',
  '#ffd24a', '#2ee6c5', '#ff8adf', '#7cff4a', '#ff9d4a',
  '#6ce5ff', '#c0c8c8', '#e05aff', '#f0f0f0', '#8fa0ff',
  '#d4b483',
];

interface ExpiryCurve {
  label: string;
  tte: number;
  points: [number, number][]; // [strike, iv], ascending by strike
}

export default function IVCurvesPanel({ data }: { data: IVCurvesResponse }) {
  const option = useMemo<EChartsOption>(() => {
    // group quotes by expiry, then build one smile curve (IV vs strike) per expiry.
    const byExpiry = new Map<string, { tte: number; strikes: Map<number, number[]> }>();
    for (const p of data.points) {
      let row = byExpiry.get(p.expiry);
      if (!row) {
        row = { tte: p.tte_years, strikes: new Map() };
        byExpiry.set(p.expiry, row);
      }
      const ivs = row.strikes.get(p.strike);
      if (ivs) ivs.push(p.mark_iv);
      else row.strikes.set(p.strike, [p.mark_iv]);
    }

    const curves: ExpiryCurve[] = [...byExpiry.entries()]
      .map(([iso, row]) => {
        // ascending strikes; average IV where a call and a put share a strike.
        const points = [...row.strikes.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([strike, ivs]) => [
            strike,
            ivs.reduce((s, v) => s + v, 0) / ivs.length,
          ] as [number, number]);
        return { label: expiryLabel(iso), tte: row.tte, points };
      })
      .sort((a, b) => a.tte - b.tte); // near-dated first, so legend/z-order is chronological

    const axisLabelStyle = { color: AMBER, fontFamily: MONO, fontSize: 11 };
    const nameStyle = { color: AMBER, fontFamily: MONO, fontSize: 13 };

    const ivFmt = (v: number) => `${Math.round(v * 100)}%`;

    const opt = {
      backgroundColor: 'transparent',
      color: PALETTE,
      tooltip: {
        trigger: 'item',
        backgroundColor: '#0b0e10',
        borderColor: GRID,
        borderWidth: 1,
        textStyle: { color: AMBER, fontFamily: MONO, fontSize: 12 },
        formatter: (p: { seriesName?: string; value?: number[] }) => {
          const arr = p.value ?? [];
          if (arr.length < 2) return '';
          const [k, iv] = arr;
          return `${p.seriesName}<br/>K ${k.toLocaleString('en-US')}<br/>IV ${(iv * 100).toFixed(1)}%`;
        },
      },
      legend: {
        type: 'scroll',
        top: 6,
        left: 10,
        right: 10,
        itemWidth: 18,
        itemHeight: 2,
        itemGap: 12,
        textStyle: { color: TEXT, fontFamily: MONO, fontSize: 10 },
        pageTextStyle: { color: AMBER, fontFamily: MONO },
        pageIconColor: AMBER,
        pageIconInactiveColor: AXIS_LINE,
        data: curves.map((c) => c.label),
      },
      grid: { left: 56, right: 18, top: 66, bottom: 44 },
      xAxis: {
        type: 'value',
        name: 'STRIKE',
        nameLocation: 'middle',
        nameGap: 28,
        nameTextStyle: nameStyle,
        scale: true,
        axisLine: { lineStyle: { color: AXIS_LINE } },
        axisTick: { lineStyle: { color: AXIS_LINE } },
        axisLabel: { ...axisLabelStyle, formatter: strikeFmt },
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
      series: curves.map((c) => ({
        type: 'line',
        name: c.label,
        data: c.points,
        showSymbol: false,
        smooth: true,
        lineStyle: { width: 1.5 },
        emphasis: { focus: 'series', lineStyle: { width: 3 } },
      })),
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
