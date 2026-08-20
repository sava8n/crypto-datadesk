import type { EChartsOption } from 'echarts';
import { useMemo } from 'react';
import { C } from '../../theme/charts';
import { grid, itemTooltip, legendBar, tuple, valueAxisX, valueAxisY } from '../../theme/options';
import type { IVCurvePoint } from '../../types';
import { averageByStrike } from '../../utils/curves';
import { pctOne, pctWhole, strikeFmt, strikeFull } from '../../utils/format';
import EChart from '../chart/EChart';

export interface SmileCompareData {
  current: IVCurvePoint[];
  // the same expiry's smile from the archived baseline; empty until one exists
  previous: IVCurvePoint[];
  previousLabel: string;
}

export function buildSmileCompareOption(data: SmileCompareData): EChartsOption {
  const current = averageByStrike(data.current, (p) => p.mark_iv);
  const previous = averageByStrike(data.previous, (p) => p.mark_iv);
  const names = ['CURRENT', ...(previous.length >= 2 ? [data.previousLabel] : [])];

  return {
    backgroundColor: 'transparent',
    legend: legendBar(names),
    tooltip: itemTooltip((p) => {
      const [k, iv] = tuple(p.value);
      if (k === undefined) return '';
      return `${p.seriesName}<br/>K ${strikeFull(k)}<br/>IV ${pctOne(iv)}%`;
    }),
    grid: grid('bars'),
    xAxis: valueAxisX({ name: 'STRIKE', scale: true, format: strikeFmt }),
    yAxis: valueAxisY({ name: 'IV', scale: true, format: pctWhole }),
    series: [
      {
        type: 'line',
        name: 'CURRENT',
        data: current,
        showSymbol: false,
        smooth: true,
        itemStyle: { color: C.ref },
        lineStyle: { width: 1.5, color: C.ref },
        emphasis: { focus: 'series', lineStyle: { width: 3 } },
      },
      ...(previous.length >= 2
        ? [
            {
              type: 'line' as const,
              name: data.previousLabel,
              data: previous,
              showSymbol: false,
              smooth: true,
              // now against prior: neither reading is a direction, so both take the reference
              // axis - violet for now, teal for the older snapshot, and dashed as well as
              // different in hue
              itemStyle: { color: C.s2 },
              lineStyle: { width: 1.5, color: C.s2, type: 'dashed' as const },
              emphasis: { focus: 'series' as const, lineStyle: { width: 3 } },
            },
          ]
        : []),
    ],
  };
}

export default function SmileCompareChart({ data }: { data: SmileCompareData }) {
  return <EChart option={useMemo(() => buildSmileCompareOption(data), [data])} />;
}
