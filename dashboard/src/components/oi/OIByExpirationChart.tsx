import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';

import EChart from '../chart/EChart';
import type { OIByExpirationResponse } from '../../types';
import { countShort, expiryLabel } from '../../utils/format';
import { axisTooltip, categoryAxisX, grid, legendBar, valueAxisY } from '../../theme/options';
import { OI_SERIES, OI_SERIES_NAMES } from './series';

export function buildOIByExpirationOption(data: OIByExpirationResponse): EChartsOption {
  // one stacked bar per expiry, near-dated first
  const rows = [...data.points].sort((a, b) => a.tte_years - b.tte_years);

  return {
    backgroundColor: 'transparent',
    legend: legendBar([...OI_SERIES_NAMES]),
    tooltip: axisTooltip({ shadow: true, value: countShort }),
    grid: grid('bars'),
    // interval 0: every expiry gets a label, the axis is short enough
    xAxis: categoryAxisX(rows.map((p) => expiryLabel(p.expiry)), { interval: 0 }),
    yAxis: valueAxisY({ name: 'OI', format: countShort }),
    series: OI_SERIES.map((s) => ({
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

export default function OIByExpirationChart({ data }: { data: OIByExpirationResponse }) {
  return <EChart option={useMemo(() => buildOIByExpirationOption(data), [data])} />;
}
