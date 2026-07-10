import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

import type { ProbCurvePoint } from '../../types';
import { strikeFmt } from '../../utils/format';
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

// open-ended tail buckets (below lowest / above highest quoted strike), dimmer than interior
const TAIL = '#c8860b';

interface Bucket {
  label: string;
  prob: number;
  tail: boolean;
}

export default function ProbDistributionPanel({
  points,
  spot,
}: {
  points: ProbCurvePoint[]; // single expiry
  spot: number;
}) {
  const option = useMemo<EChartsOption>(() => {
    // ascending strikes; average where a call and a put share a strike
    const byStrike = new Map<number, number[]>();
    for (const p of points) {
      const probs = byStrike.get(p.strike);
      if (probs) probs.push(p.prob_above);
      else byStrike.set(p.strike, [p.prob_above]);
    }
    const curve = [...byStrike.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(
        ([strike, probs]) =>
          [strike, probs.reduce((s, v) => s + v, 0) / probs.length] as [number, number],
      );

    // Bucket mass between adjacent strikes: P(K1 < S <= K2) = P(S>K1) - P(S>K2).
    // Per-strike IVs can locally invert the curve, so clamp negatives to zero.
    // Tail buckets close the distribution so the bars sum to ~100%.
    const first = curve[0];
    const last = curve[curve.length - 1];
    const buckets: Bucket[] = [
      { label: `<${strikeFmt(first[0])}`, prob: Math.max(0, 1 - first[1]), tail: true },
    ];
    for (let i = 0; i + 1 < curve.length; i += 1) {
      buckets.push({
        label: `${strikeFmt(curve[i][0])}–${strikeFmt(curve[i + 1][0])}`,
        prob: Math.max(0, curve[i][1] - curve[i + 1][1]),
        tail: false,
      });
    }
    buckets.push({ label: `>${strikeFmt(last[0])}`, prob: Math.max(0, last[1]), tail: true });

    // interior bucket containing spot; SPOT marker sits at its centre (bucket resolution)
    let spotBucket = -1;
    for (let i = 0; i + 1 < curve.length; i += 1) {
      if (curve[i][0] < spot && spot <= curve[i + 1][0]) {
        spotBucket = i + 1; // +1: low tail occupies category 0
        break;
      }
    }

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
