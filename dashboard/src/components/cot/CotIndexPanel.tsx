import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

import { useSettings } from '../../settings/store';
import { AXIS_LINE, GRID, ZERO, axisLabelStyle, axisNameStyle, tooltipStyle, visibleCotCategories } from '../../theme/charts';
import type { CotIndexResponse } from '../../types';
import { expiryLabel } from '../../utils/format';

interface TooltipItem {
  marker?: string;
  seriesName?: string;
  axisValueLabel?: string;
  value?: number | null;
}

export default function CotIndexPanel({ data }: { data: CotIndexResponse }) {
  const { participants } = useSettings().cot;
  const option = useMemo<EChartsOption>(() => {
    const categories = visibleCotCategories(participants);
    // drop the leading all-null region where the rolling window is still unfilled,
    // then show only the selected window's span (0 = full history)
    const first = data.points.findIndex((p) => categories.some((c) => p[c.key] != null));
    const trimmed = first > 0 ? data.points.slice(first) : data.points;
    const points = data.window > 0 ? trimmed.slice(-data.window) : trimmed;

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
        formatter: (params: TooltipItem[]) => {
          const head = params[0]?.axisValueLabel ?? '';
          const rows = params
            .map((s) => `${s.marker} ${s.seriesName} ${s.value != null ? Number(s.value).toFixed(0) : '—'}`)
            .join('<br/>');
          return `${head}<br/>${rows}`;
        },
      },
      grid: { left: 48, right: 18, top: 40, bottom: 56 },
      xAxis: {
        type: 'category',
        data: points.map((p) => expiryLabel(p.report_date)),
        axisLine: { lineStyle: { color: AXIS_LINE } },
        axisTick: { lineStyle: { color: AXIS_LINE } },
        axisLabel: { ...axisLabelStyle, rotate: 45 },
      },
      yAxis: {
        type: 'value',
        name: 'INDEX',
        nameGap: 14,
        nameTextStyle: axisNameStyle,
        min: 0,
        max: 100,
        axisLine: { lineStyle: { color: AXIS_LINE } },
        axisTick: { lineStyle: { color: AXIS_LINE } },
        axisLabel: axisLabelStyle,
        splitLine: { lineStyle: { color: GRID } },
      },
      series: categories.map((cat, i) => ({
        type: 'line',
        name: cat.name,
        data: points.map((p) => p[cat.key]),
        showSymbol: false,
        connectNulls: false,
        lineStyle: { width: 1.5, color: cat.color },
        itemStyle: { color: cat.color },
        emphasis: { focus: 'series', lineStyle: { width: 3 } },
        ...(i === 0
          ? {
              // overheating zones: beyond 15/85 positioning is at a windowed extreme
              markLine: {
                symbol: 'none',
                silent: true,
                lineStyle: { color: ZERO, type: 'dashed', width: 1 },
                label: { show: false },
                data: [{ yAxis: 15 }, { yAxis: 85 }],
              },
              markArea: {
                silent: true,
                itemStyle: { color: 'rgba(255, 176, 0, 0.07)' },
                data: [
                  [{ yAxis: 0 }, { yAxis: 15 }],
                  [{ yAxis: 85 }, { yAxis: 100 }],
                ],
              },
            }
          : {}),
      })),
    };

    return opt as unknown as EChartsOption;
  }, [data, participants]);

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
