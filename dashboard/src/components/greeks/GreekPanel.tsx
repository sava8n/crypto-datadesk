import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

import { strikeFmt } from '../../utils/format';
import {
  AXIS_LINE,
  GRID,
  axisLabelStyle,
  axisNameStyle,
  tooltipStyle,
} from '../../theme/charts';

export interface GreekPoint {
  strike: number;
  value: number;
}

interface Props {
  points: GreekPoint[];
  label: string;
  color: string;
  valueFmt: (v: number) => string;
}

// One greek line (value vs strike) for a single expiry. Points are sorted by
// strike, then value, so at the ATM crossover the OTM put (negative) precedes
// the OTM call (positive) - reproducing delta's sign flip as a clean spike.
export default function GreekPanel({ points, label, color, valueFmt }: Props) {
  const option = useMemo<EChartsOption>(() => {
    const data = points
      .slice()
      .sort((a, b) => a.strike - b.strike || a.value - b.value)
      .map((p) => [p.strike, p.value] as [number, number]);

    // compact panels in a 2x2 grid, so one point smaller than the shared styles
    const labelStyle = { ...axisLabelStyle, fontSize: 10 };
    const nameStyle = { ...axisNameStyle, fontSize: 12 };

    const opt = {
      backgroundColor: 'transparent',
      tooltip: {
        ...tooltipStyle,
        trigger: 'item',
        formatter: (p: { value?: number[] }) => {
          const arr = p.value ?? [];
          if (arr.length < 2) return '';
          const [k, v] = arr;
          return `${label}<br/>K ${k.toLocaleString('en-US')}<br/>${valueFmt(v)}`;
        },
      },
      grid: { left: 68, right: 16, top: 16, bottom: 40 },
      xAxis: {
        type: 'value',
        name: 'STRIKE',
        nameLocation: 'middle',
        nameGap: 26,
        nameTextStyle: nameStyle,
        scale: true,
        axisLine: { lineStyle: { color: AXIS_LINE } },
        axisTick: { lineStyle: { color: AXIS_LINE } },
        axisLabel: { ...labelStyle, formatter: strikeFmt },
        splitLine: { lineStyle: { color: GRID } },
      },
      yAxis: {
        type: 'value',
        scale: true,
        axisLine: { lineStyle: { color: AXIS_LINE } },
        axisTick: { lineStyle: { color: AXIS_LINE } },
        axisLabel: { ...labelStyle, formatter: valueFmt },
        splitLine: { lineStyle: { color: GRID } },
      },
      series: [
        {
          type: 'line',
          name: label,
          data,
          showSymbol: false,
          smooth: true,
          itemStyle: { color },
          lineStyle: { color, width: 1.5 },
          emphasis: { focus: 'series', lineStyle: { width: 3 } },
        },
      ],
    };

    return opt as unknown as EChartsOption;
  }, [points, color, label, valueFmt]);

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
