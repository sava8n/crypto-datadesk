import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';

import EChart from '../chart/EChart';
import { strikeFmt, strikeFull } from '../../utils/format';
import { grid, itemTooltip, tuple, valueAxisX, valueAxisY } from '../../theme/options';

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

export function buildGreekOption(
  points: GreekPoint[],
  label: string,
  color: string,
  valueFmt: (v: number) => string,
): EChartsOption {
  // sorted by strike then value, so at the ATM crossover the OTM put (negative)
  // precedes the OTM call (positive) - reproducing delta's sign flip as a clean spike
  const data = points
    .slice()
    .sort((a, b) => a.strike - b.strike || a.value - b.value)
    .map((p) => [p.strike, p.value]);

  return {
    backgroundColor: 'transparent',
    tooltip: itemTooltip((p) => {
      const [k, v] = tuple(p.value);
      if (k === undefined) return '';
      return `${label}<br/>K ${strikeFull(k)}<br/>${valueFmt(v)}`;
    }),
    grid: grid('miniWide'),
    xAxis: valueAxisX({
      name: 'STRIKE',
      nameGap: 26,
      scale: true,
      format: strikeFmt,
      compact: true,
    }),
    yAxis: valueAxisY({ scale: true, format: valueFmt, compact: true }),
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
}

export default function GreekChart({ points, label, color, valueFmt }: Props) {
  const option = useMemo(
    () => buildGreekOption(points, label, color, valueFmt),
    [points, label, color, valueFmt],
  );
  return <EChart option={option} />;
}
