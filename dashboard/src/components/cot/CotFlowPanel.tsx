import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

import { useSettings } from '../../settings/store';
import { AXIS_LINE, GRID, ZERO, axisLabelStyle, axisNameStyle, tooltipStyle, visibleCotCategories } from '../../theme/charts';
import type { CotHistoryResponse } from '../../types';
import { coinEquiv, coinEquivSigned, expiryLabel } from '../../utils/format';

interface TooltipItem {
  marker?: string;
  seriesName?: string;
  axisValueLabel?: string;
  value?: number | null;
}

export default function CotFlowPanel({
  data,
  weeks,
}: {
  data: CotHistoryResponse;
  weeks: number;
}) {
  const { participants } = useSettings().cot;
  const option = useMemo<EChartsOption>(() => {
    const points = data.points.slice(-weeks);
    const categories = visibleCotCategories(participants);

    const opt = {
      backgroundColor: 'transparent',
      legend: {
        top: 4,
        itemWidth: 10,
        itemHeight: 10,
        textStyle: axisLabelStyle,
      },
      tooltip: {
        ...tooltipStyle,
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: TooltipItem[]) => {
          const head = params[0]?.axisValueLabel ?? '';
          const rows = params
            .map((s) => `${s.marker} ${s.seriesName} ${coinEquivSigned(s.value ?? 0)}`)
            .join('<br/>');
          return `${head}<br/>${rows}`;
        },
      },
      grid: { left: 64, right: 18, top: 40, bottom: 56 },
      xAxis: {
        type: 'category',
        data: points.map((p) => expiryLabel(p.report_date)),
        axisLine: { lineStyle: { color: AXIS_LINE } },
        axisTick: { lineStyle: { color: AXIS_LINE } },
        axisLabel: { ...axisLabelStyle, rotate: 45 },
      },
      yAxis: {
        type: 'value',
        name: `ΔNET ${data.currency}`,
        nameGap: 14,
        nameTextStyle: axisNameStyle,
        axisLine: { lineStyle: { color: AXIS_LINE } },
        axisTick: { lineStyle: { color: AXIS_LINE } },
        axisLabel: { ...axisLabelStyle, formatter: coinEquiv },
        splitLine: { lineStyle: { color: GRID } },
      },
      series: categories.map((cat, i) => ({
        type: 'bar',
        name: cat.name,
        stack: 'flow',
        data: points.map((p) => p[`${cat.key}_delta`] ?? 0),
        barMaxWidth: 18,
        // dark hairline keeps stacked segments legible on the shared stack
        itemStyle: { color: cat.color, borderColor: '#050607', borderWidth: 1 },
        ...(i === 0
          ? {
              markLine: {
                symbol: 'none',
                silent: true,
                lineStyle: { color: ZERO, width: 1 },
                label: { show: false },
                data: [{ yAxis: 0 }],
              },
            }
          : {}),
      })),
    };

    return opt as unknown as EChartsOption;
  }, [data, weeks, participants]);

  return (
    <ReactECharts
      option={option}
      notMerge
      lazyUpdate
      style={{ width: '100%', height: '100%' }}
      opts={{ renderer: 'canvas' }}
    />
  );
}
