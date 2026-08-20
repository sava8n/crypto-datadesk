import type { EChartsOption } from 'echarts';
import { useMemo } from 'react';
import { C } from '../../theme/charts';
import {
  axisTooltip,
  categoryAxisX,
  grid,
  legendBar,
  valueAxisY,
  zeroLine,
} from '../../theme/options';
import type { FlowByExpiryResponse } from '../../types';
import { countShort, dateLabel, usdShort } from '../../utils/format';
import EChart from '../chart/EChart';

export function buildFlowByExpiryOption(data: FlowByExpiryResponse): EChartsOption {
  const rows = [...data.points].sort(
    (a, b) => new Date(a.expiry).getTime() - new Date(b.expiry).getTime(),
  );

  return {
    backgroundColor: 'transparent',
    legend: legendBar(['Call Flow', 'Put Flow']),
    tooltip: axisTooltip({
      shadow: true,
      render: (p) => {
        const r = rows[p.dataIndex ?? -1];
        if (!r) return '';
        return (
          `${dateLabel(r.expiry)}<br/>` +
          `CALL ${countShort(r.call_contracts)} · ${usdShort(r.call_premium)}<br/>` +
          `PUT ${countShort(r.put_contracts)} · ${usdShort(r.put_premium)}`
        );
      },
    }),
    grid: grid('bars'),
    xAxis: categoryAxisX(rows.map((p) => dateLabel(p.expiry))),
    yAxis: valueAxisY({ name: 'NET', format: countShort }),
    series: [
      {
        type: 'bar',
        name: 'Call Flow',
        barMaxWidth: 22,
        data: rows.map((p) => p.call_contracts),
        itemStyle: { color: C.call },
        emphasis: { focus: 'series' },
        markLine: zeroLine(),
      },
      {
        type: 'bar',
        name: 'Put Flow',
        barMaxWidth: 22,
        data: rows.map((p) => p.put_contracts),
        itemStyle: { color: C.put },
        emphasis: { focus: 'series' },
      },
    ],
  };
}

export default function FlowByExpiryChart({ data }: { data: FlowByExpiryResponse }) {
  return <EChart option={useMemo(() => buildFlowByExpiryOption(data), [data])} />;
}
