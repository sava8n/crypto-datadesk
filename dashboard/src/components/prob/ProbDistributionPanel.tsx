import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { ProbCurvePoint } from '../../types';
import { buildBuckets } from './buckets';
import {
  AMBER,
  AXIS_LINE,
  GRID,
  MONO,
  ZERO,
  axisLabelStyle,
  axisNameStyle,
  tooltipStyle,
} from '../../theme/charts';

// open-ended tail buckets (below lowest / above highest quoted strike)
const TAIL = '#c8860b';

export default function ProbDistributionPanel({
  points,
  spot,
}: {
  points: ProbCurvePoint[]; // single expiry
  spot: number;
}) {
  const option = useMemo<EChartsOption>(() => {
    const { buckets, spotBucket } = buildBuckets(points, spot);

    const opt = {
      backgroundColor: 'transparent',
      tooltip: {
        ...tooltipStyle,
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        valueFormatter: (v: number | string) => `${(Number(v) * 100).toFixed(1)}%`,
      },
      grid: { left: 56, right: 18, top: 30, bottom: 60 },
      xAxis: {
        type: 'category',
        data: buckets.map((b) => b.label),
        axisLine: { lineStyle: { color: AXIS_LINE } },
        axisTick: { lineStyle: { color: AXIS_LINE } },
        axisLabel: { ...axisLabelStyle, rotate: 45, interval: 'auto' },
      },
      yAxis: {
        type: 'value',
        name: 'P(BUCKET)',
        nameGap: 12,
        nameTextStyle: axisNameStyle,
        min: 0,
        axisLine: { lineStyle: { color: AXIS_LINE } },
        axisTick: { lineStyle: { color: AXIS_LINE } },
        axisLabel: { ...axisLabelStyle, formatter: (v: number) => `${Math.round(v * 100)}%` },
        splitLine: { lineStyle: { color: GRID } },
      },
      series: [
        {
          type: 'bar',
          name: 'P',
          barMaxWidth: 22,
          barCategoryGap: '20%',
          data: buckets.map((b) => ({
            value: b.prob,
            itemStyle: { color: b.tail ? TAIL : AMBER },
          })),
          emphasis: { focus: 'series' },
          ...(spotBucket >= 0 && {
            markLine: {
              silent: true,
              symbol: 'none',
              lineStyle: { color: ZERO, type: 'dashed', width: 1 },
              label: {
                color: ZERO,
                fontFamily: MONO,
                fontSize: 10,
                formatter: 'SPOT',
              },
              data: [{ xAxis: spotBucket }],
            },
          }),
        },
      ],
    };

    return opt as unknown as EChartsOption;
  }, [points, spot]);

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
