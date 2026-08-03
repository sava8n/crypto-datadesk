import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';

import EChart from '../chart/EChart';
import type { OIChangeByStrikeResponse } from '../../types';
import { countShort, strikeFmt } from '../../utils/format';
import { CALL, MUTED, PUT } from '../../theme/charts';
import { axisTooltip, categoryAxisX, grid, legendBar, valueAxisY } from '../../theme/options';

const SERIES_NAMES = ['Call ΔOI', 'Put ΔOI'];

export function buildOIChangeByStrikeOption(data: OIChangeByStrikeResponse): EChartsOption {
  // one call/put delta pair per strike, low strikes first; deltas are signed
  const rows = [...data.points].sort((a, b) => a.strike - b.strike);

  return {
    backgroundColor: 'transparent',
    legend: legendBar(SERIES_NAMES),
    tooltip: axisTooltip({ shadow: true, value: countShort }),
    grid: grid('bars'),
    xAxis: categoryAxisX(rows.map((p) => strikeFmt(p.strike))),
    yAxis: valueAxisY({ name: 'ΔOI', format: countShort }),
    series: [
      {
        type: 'bar',
        name: 'Call ΔOI',
        barMaxWidth: 22,
        data: rows.map((p) => p.call_oi_change),
        itemStyle: { color: CALL },
        emphasis: { focus: 'series' },
        markLine: {
          symbol: 'none',
          silent: true,
          lineStyle: { color: MUTED, type: 'dashed', width: 1.5 },
          label: { show: false },
          data: [{ yAxis: 0 }],
        },
      },
      {
        type: 'bar',
        name: 'Put ΔOI',
        barMaxWidth: 22,
        data: rows.map((p) => p.put_oi_change),
        itemStyle: { color: PUT },
        emphasis: { focus: 'series' },
      },
    ],
  };
}

export default function OIChangeByStrikeChart({ data }: { data: OIChangeByStrikeResponse }) {
  return <EChart option={useMemo(() => buildOIChangeByStrikeOption(data), [data])} />;
}
