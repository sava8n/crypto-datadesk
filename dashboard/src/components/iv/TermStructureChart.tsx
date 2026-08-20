import type { EChartsOption } from 'echarts';
import { useMemo } from 'react';
import { colors } from '../../theme/charts';
import { grid, itemTooltip, valueAxisX, valueAxisY } from '../../theme/options';
import type { CMBandPoint, TermStructureResponse } from '../../types';
import { dteOf } from '../../utils/dte';
import { dateLabel, dteLabel, pctOne, pctWhole } from '../../utils/format';
import EChart from '../chart/EChart';
import { bandRows, bandSeries } from './bands';

export function buildTermStructureOption(
  data: TermStructureResponse,
  bands: CMBandPoint[] = [],
): EChartsOption {
  const rows = data.points
    .map((p) => ({ dte: dteOf(p), iv: p.atm_iv, expiry: p.expiry }))
    .sort((a, b) => a.dte - b.dte);
  const maxDte = rows[rows.length - 1]?.dte ?? 0;

  return {
    backgroundColor: 'transparent',
    tooltip: itemTooltip((p) => {
      const r = rows[p.dataIndex ?? -1];
      if (!r) return '';
      return `${dateLabel(r.expiry)}<br/>DTE ${dteLabel(r.dte)}<br/>IV ${pctOne(r.iv)}%`;
    }),
    grid: grid('series'),
    xAxis: valueAxisX({ name: 'DTE', scale: true, min: 0, format: dteLabel }),
    yAxis: valueAxisY({ name: 'IV', scale: true, format: pctWhole }),
    series: [
      ...bandSeries(bandRows(bands, 'atm_iv', maxDte), colors.ref),
      {
        type: 'line',
        name: 'ATM IV',
        data: rows.map((r) => [r.dte, r.iv]),
        showSymbol: true,
        symbolSize: 6,
        itemStyle: { color: colors.ref },
        lineStyle: { width: 1.5, color: colors.ref },
        emphasis: { focus: 'series', lineStyle: { width: 3 } },
      },
    ],
  };
}

export default function TermStructureChart({
  data,
  bands,
}: {
  data: TermStructureResponse;
  bands?: CMBandPoint[];
}) {
  return <EChart option={useMemo(() => buildTermStructureOption(data, bands), [data, bands])} />;
}
