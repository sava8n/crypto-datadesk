import type { EChartsOption } from 'echarts';
import { useMemo } from 'react';
import { C, MONO } from '../../theme/charts';
import { axisTooltip, categoryAxisX, grid, legendBar, valueAxisY } from '../../theme/options';
import type { ProbCurvePoint } from '../../types';
import { pctWhole, volPct } from '../../utils/format';
import EChart from '../chart/EChart';
import { buildBuckets } from './buckets';

interface Props {
  points: ProbCurvePoint[];
  spot: number;
}

const SERIES_NAMES = ['Body', 'Tail'];

export function buildProbDistributionOption(points: ProbCurvePoint[], spot: number): EChartsOption {
  const { buckets, spotBucket } = buildBuckets(points, spot);

  // body and tail are one distribution but two colours, so they are split into two
  // series - null in the other's slots - purely so the legend can name them
  const slot = (want: boolean) => buckets.map((b) => (b.tail === want ? b.prob : null));

  return {
    backgroundColor: 'transparent',
    tooltip: axisTooltip({ shadow: true, value: volPct }),
    legend: legendBar(SERIES_NAMES),
    grid: grid('bars'),
    xAxis: categoryAxisX(buckets.map((b) => b.label)),
    yAxis: valueAxisY({ name: 'P(BUCKET)', min: 0, format: pctWhole }),
    series: [
      {
        type: 'bar',
        name: SERIES_NAMES[0],
        barMaxWidth: 22,
        barCategoryGap: '20%',
        barGap: '-100%',
        itemStyle: { color: C.s1 },
        data: slot(false),
        emphasis: { focus: 'series' },
        ...(spotBucket >= 0 && {
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: C.label, type: 'dashed', width: 1 },
            label: { color: C.label, fontFamily: MONO, fontSize: 10, formatter: 'SPOT' },
            data: [{ xAxis: spotBucket }],
          },
        }),
      },
      {
        type: 'bar',
        name: SERIES_NAMES[1],
        barMaxWidth: 22,
        barCategoryGap: '20%',
        barGap: '-100%',
        itemStyle: { color: C.warn },
        data: slot(true),
        emphasis: { focus: 'series' },
      },
    ],
  };
}

export default function ProbDistributionChart({ points, spot }: Props) {
  return (
    <EChart option={useMemo(() => buildProbDistributionOption(points, spot), [points, spot])} />
  );
}
