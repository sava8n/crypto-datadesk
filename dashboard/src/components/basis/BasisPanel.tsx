import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

import type { TermStructureResponse } from '../../types';
import { expiryLabel, usdFull } from '../../utils/format';
import {
  AMBER,
  AXIS_LINE,
  GRID,
  ZERO,
  axisLabelStyle,
  axisNameStyle,
  tooltipStyle,
} from '../../theme/charts';

interface BasisRow {
  dte: number;
  forward: number;
  basis: number; // F/S − 1
  basisAnn: number; // (F/S − 1) / T
  expiry: string;
}

const pct1 = (v: number) => `${(v * 100).toFixed(1)}%`;

export default function BasisPanel({ data }: { data: TermStructureResponse }) {
  const option = useMemo<EChartsOption>(() => {
    // one point per expiry: annualized basis of the per-expiry forward vs spot
    const rows: BasisRow[] = data.points
      .filter((p) => p.tte_years > 0 && data.spot > 0)
      .map((p) => {
        const basis = p.forward / data.spot - 1;
        return {
          dte: p.tte_years * 365.25,
          forward: p.forward,
          basis,
          basisAnn: basis / p.tte_years,
          expiry: p.expiry,
        };
      })
      .sort((a, b) => a.dte - b.dte);

    // compact panels in the mini grid, so one point smaller than the shared styles
    const labelStyle = { ...axisLabelStyle, fontSize: 10 };
    const nameStyle = { ...axisNameStyle, fontSize: 12 };

    const opt = {
      backgroundColor: 'transparent',
      tooltip: {
        ...tooltipStyle,
        trigger: 'axis',
        formatter: (params: { dataIndex?: number } | { dataIndex?: number }[]) => {
          const first = Array.isArray(params) ? params[0] : params;
          const r = rows[first?.dataIndex ?? -1];
          if (!r) return '';
          return `${expiryLabel(r.expiry)}<br/>DTE ${Math.round(r.dte)}d · FWD ${usdFull(r.forward)}<br/>BASIS ${pct1(r.basis)} · ANN ${pct1(r.basisAnn)}`;
        },
      },
      grid: { left: 56, right: 16, top: 16, bottom: 40 },
      xAxis: {
        type: 'value',
        name: 'DTE',
        nameLocation: 'middle',
        nameGap: 26,
        nameTextStyle: nameStyle,
        scale: true,
        min: 0,
        axisLine: { lineStyle: { color: AXIS_LINE } },
        axisTick: { lineStyle: { color: AXIS_LINE } },
        axisLabel: { ...labelStyle, formatter: (d: number) => `${Math.round(d)}d` },
        splitLine: { lineStyle: { color: GRID } },
      },
      yAxis: {
        type: 'value',
        scale: true,
        axisLine: { lineStyle: { color: AXIS_LINE } },
        axisTick: { lineStyle: { color: AXIS_LINE } },
        axisLabel: { ...labelStyle, formatter: pct1 },
        splitLine: { lineStyle: { color: GRID } },
      },
      series: [
        {
          type: 'line',
          name: 'Annualized Basis',
          data: rows.map((r) => [r.dte, r.basisAnn]),
          showSymbol: true,
          symbolSize: 5,
          itemStyle: { color: AMBER },
          lineStyle: { width: 1.5, color: AMBER },
          emphasis: { focus: 'series', lineStyle: { width: 3 } },
          // zero line: above = contango (forwards over spot), below = backwardation
          markLine: {
            symbol: 'none',
            silent: true,
            lineStyle: { color: ZERO, type: 'dashed', width: 1.5 },
            label: { show: false },
            data: [{ yAxis: 0 }],
          },
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
