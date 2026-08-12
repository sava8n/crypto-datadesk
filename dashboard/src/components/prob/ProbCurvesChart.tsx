import type { EChartsOption } from 'echarts';
import { useMemo } from 'react';
import { MONO, MUTED, PALETTE } from '../../theme/charts';
import {
  grid,
  itemTooltip,
  legendScroll,
  tuple,
  valueAxisX,
  valueAxisY,
} from '../../theme/options';
import type { ProbCurvesResponse } from '../../types';
import { groupByExpiry } from '../../utils/curves';
import { dateLabel, pctOne, pctWhole, strikeFmt, strikeFull } from '../../utils/format';
import EChart from '../chart/EChart';

export function buildProbCurvesOption(data: ProbCurvesResponse): EChartsOption {
  // near-dated first, so legend and z-order are chronological
  const curves = groupByExpiry(data.points, (p) => p.prob_above).map((c) => ({
    ...c,
    label: dateLabel(c.expiry),
  }));

  return {
    backgroundColor: 'transparent',
    color: PALETTE,
    tooltip: itemTooltip((p) => {
      const [k, prob] = tuple(p.value);
      if (k === undefined) return '';
      return `${p.seriesName}<br/>K ${strikeFull(k)}<br/>P ${pctOne(prob)}%`;
    }),
    legend: legendScroll(curves.map((c) => c.label)),
    grid: grid('curves'),
    xAxis: valueAxisX({ name: 'STRIKE', scale: true, format: strikeFmt }),
    yAxis: valueAxisY({ name: 'P(S>K)', min: 0, max: 1, format: pctWhole }),
    series: curves.map((c, i) => ({
      type: 'line',
      name: c.label,
      data: c.points,
      showSymbol: true,
      symbol: 'circle',
      symbolSize: 4,
      smooth: true,
      lineStyle: { width: 1.5 },
      emphasis: { focus: 'series', lineStyle: { width: 3 } },
      // one spot marker for the whole chart, carried by the first series
      ...(i === 0 && {
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: MUTED, type: 'dashed', width: 1 },
          label: { color: MUTED, fontFamily: MONO, fontSize: 10, formatter: 'SPOT' },
          data: [{ xAxis: data.spot }],
        },
      }),
    })),
  };
}

export default function ProbCurvesChart({ data }: { data: ProbCurvesResponse }) {
  return <EChart option={useMemo(() => buildProbCurvesOption(data), [data])} />;
}
