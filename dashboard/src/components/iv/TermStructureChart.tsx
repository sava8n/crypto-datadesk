import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';

import EChart from '../chart/EChart';
import type { TermStructureResponse } from '../../types';
import { DAYS_PER_YEAR } from '../../utils/constants';
import { dteLabel, expiryLabel, pctOne, pctWhole } from '../../utils/format';
import { AMBER } from '../../theme/charts';
import { grid, itemTooltip, valueAxisX, valueAxisY } from '../../theme/options';

export function buildTermStructureOption(data: TermStructureResponse): EChartsOption {
  // one ATM IV per expiry, plotted time-proportionally by days-to-expiry
  const rows = data.points
    .map((p) => ({ dte: p.tte_years * DAYS_PER_YEAR, iv: p.atm_iv, expiry: p.expiry }))
    .sort((a, b) => a.dte - b.dte);

  return {
    backgroundColor: 'transparent',
    tooltip: itemTooltip((p) => {
      const r = rows[p.dataIndex ?? -1];
      if (!r) return '';
      return `${expiryLabel(r.expiry)}<br/>DTE ${dteLabel(r.dte)}<br/>IV ${pctOne(r.iv)}%`;
    }),
    grid: grid('series'),
    xAxis: valueAxisX({ name: 'DTE', scale: true, min: 0, format: dteLabel }),
    yAxis: valueAxisY({ name: 'IV', scale: true, format: pctWhole }),
    series: [
      {
        type: 'line',
        name: 'ATM IV',
        data: rows.map((r) => [r.dte, r.iv]),
        showSymbol: true,
        symbolSize: 6,
        itemStyle: { color: AMBER },
        lineStyle: { width: 1.5, color: AMBER },
        emphasis: { focus: 'series', lineStyle: { width: 3 } },
      },
    ],
  };
}

export default function TermStructureChart({ data }: { data: TermStructureResponse }) {
  return <EChart option={useMemo(() => buildTermStructureOption(data), [data])} />;
}
