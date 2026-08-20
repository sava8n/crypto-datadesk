import type { EChartsOption } from 'echarts';
import { useMemo } from 'react';
import { colors } from '../../theme/charts';
import {
  axisTooltip,
  categoryAxisX,
  grid,
  legendBar,
  valueAxisY,
  zeroLine,
} from '../../theme/options';
import type { FlowByStrikeResponse } from '../../types';
import { countShort, strikeFmt, strikeFull, usdShort } from '../../utils/format';
import EChart from '../chart/EChart';

export function buildFlowByStrikeOption(data: FlowByStrikeResponse): EChartsOption {
  const rows = [...data.points].sort((a, b) => a.strike - b.strike);

  return {
    backgroundColor: 'transparent',
    legend: legendBar(['Call Flow', 'Put Flow']),
    tooltip: axisTooltip({
      shadow: true,
      render: (p) => {
        const r = rows[p.dataIndex ?? -1];
        if (!r) return '';
        return (
          `K ${strikeFull(r.strike)}<br/>` +
          `CALL ${countShort(r.call_contracts)} · ${usdShort(r.call_premium)}<br/>` +
          `PUT ${countShort(r.put_contracts)} · ${usdShort(r.put_premium)}`
        );
      },
    }),
    grid: grid('bars'),
    xAxis: categoryAxisX(rows.map((p) => strikeFmt(p.strike))),
    yAxis: valueAxisY({ name: 'NET', format: countShort }),
    series: [
      {
        type: 'bar',
        name: 'Call Flow',
        barMaxWidth: 22,
        data: rows.map((p) => p.call_contracts),
        itemStyle: { color: colors.call },
        emphasis: { focus: 'series' },
        markLine: zeroLine(),
      },
      {
        type: 'bar',
        name: 'Put Flow',
        barMaxWidth: 22,
        data: rows.map((p) => p.put_contracts),
        itemStyle: { color: colors.put },
        emphasis: { focus: 'series' },
      },
    ],
  };
}

export default function FlowByStrikeChart({ data }: { data: FlowByStrikeResponse }) {
  return <EChart option={useMemo(() => buildFlowByStrikeOption(data), [data])} />;
}
