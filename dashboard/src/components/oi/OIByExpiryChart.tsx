import type { EChartsOption } from 'echarts';
import { useMemo } from 'react';
import { axisTooltip, categoryAxisX, grid, legendBar, valueAxisY } from '../../theme/options';
import type { OIByExpiryResponse } from '../../types';
import { countShort, dateLabel } from '../../utils/format';
import EChart from '../chart/EChart';
import { OI_SERIES_NAMES, oiSeries } from './series';

export function buildOIByExpiryOption(data: OIByExpiryResponse): EChartsOption {
  const rows = [...data.points].sort((a, b) => a.tte_years - b.tte_years);

  return {
    backgroundColor: 'transparent',
    legend: legendBar([...OI_SERIES_NAMES]),
    tooltip: axisTooltip({ shadow: true, value: countShort }),
    grid: grid('bars'),
    // interval 0: every expiry gets a label, the axis is short enough
    xAxis: categoryAxisX(
      rows.map((p) => dateLabel(p.expiry)),
      { interval: 0 },
    ),
    yAxis: valueAxisY({ name: 'OI', format: countShort }),
    series: oiSeries().map((s) => ({
      type: 'bar',
      name: s.name,
      stack: s.stack,
      barMaxWidth: 28,
      data: rows.map((p) => p[s.key]),
      itemStyle: { color: s.color },
      emphasis: { focus: 'series' },
    })),
  };
}

export default function OIByExpiryChart({ data }: { data: OIByExpiryResponse }) {
  return <EChart option={useMemo(() => buildOIByExpiryOption(data), [data])} />;
}
