import type { EChartsOption } from 'echarts';
import { useMemo } from 'react';
import { PALETTE } from '../../theme/charts';
import {
  grid,
  itemTooltip,
  legendScroll,
  tuple,
  valueAxisX,
  valueAxisY,
} from '../../theme/options';
import type { IVCurvesResponse } from '../../types';
import { groupByExpiry } from '../../utils/curves';
import { dateLabel, pctOne, pctWhole, strikeFmt, strikeFull } from '../../utils/format';
import EChart from '../chart/EChart';

export function buildIVCurvesOption(data: IVCurvesResponse): EChartsOption {
  // near-dated first, so legend and z-order are chronological
  const curves = groupByExpiry(data.points, (p) => p.mark_iv).map((c) => ({
    ...c,
    label: dateLabel(c.expiry),
  }));

  return {
    backgroundColor: 'transparent',
    color: PALETTE,
    tooltip: itemTooltip((p) => {
      const [k, iv] = tuple(p.value);
      if (k === undefined) return '';
      return `${p.seriesName}<br/>K ${strikeFull(k)}<br/>IV ${pctOne(iv)}%`;
    }),
    legend: legendScroll(curves.map((c) => c.label)),
    grid: grid('curves'),
    xAxis: valueAxisX({ name: 'STRIKE', scale: true, format: strikeFmt }),
    yAxis: valueAxisY({ name: 'IV', scale: true, format: pctWhole }),
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
}

export default function IVCurvesChart({ data }: { data: IVCurvesResponse }) {
  return <EChart option={useMemo(() => buildIVCurvesOption(data), [data])} />;
}
