import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';

import EChart from '../chart/EChart';
import type { ProbCurvePoint } from '../../types';
import { pctWhole, volPct } from '../../utils/format';
import { ACCENT, MONO, MUTED, TAIL } from '../../theme/charts';
import { axisTooltip, categoryAxisX, grid, valueAxisY } from '../../theme/options';
import { buildBuckets } from './buckets';

interface Props {
  // a single expiry
  points: ProbCurvePoint[];
  spot: number;
}

export function buildProbDistributionOption(points: ProbCurvePoint[], spot: number): EChartsOption {
  const { buckets, spotBucket } = buildBuckets(points, spot);

  return {
    backgroundColor: 'transparent',
    tooltip: axisTooltip({ shadow: true, value: volPct }),
    grid: grid('noLegend'),
    xAxis: categoryAxisX(buckets.map((b) => b.label)),
    yAxis: valueAxisY({ name: 'P(BUCKET)', min: 0, format: pctWhole }),
    series: [
      {
        type: 'bar',
        name: 'P',
        barMaxWidth: 22,
        barCategoryGap: '20%',
        data: buckets.map((b) => ({
          value: b.prob,
          itemStyle: { color: b.tail ? TAIL : ACCENT },
        })),
        emphasis: { focus: 'series' },
        ...(spotBucket >= 0 && {
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: MUTED, type: 'dashed', width: 1 },
            label: { color: MUTED, fontFamily: MONO, fontSize: 10, formatter: 'SPOT' },
            data: [{ xAxis: spotBucket }],
          },
        }),
      },
    ],
  };
}

export default function ProbDistributionChart({ points, spot }: Props) {
  return <EChart option={useMemo(() => buildProbDistributionOption(points, spot), [points, spot])} />;
}
