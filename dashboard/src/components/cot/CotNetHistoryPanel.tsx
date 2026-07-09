import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

import { AMBER, AXIS_LINE, COT_CATEGORIES, GRID, MONO, ZERO, axisLabelStyle, axisNameStyle, tooltipStyle } from '../../theme/charts';
import type { CotHistoryResponse } from '../../types';
import { btcEquiv, btcFull, expiryLabel, usdShort } from '../../utils/format';

interface TooltipItem {
  marker?: string;
  seriesName?: string;
  axisValueLabel?: string;
  value?: number | null;
}

export default function CotNetHistoryPanel({ data }: { data: CotHistoryResponse }) {
  const option = useMemo<EChartsOption>(() => {
    const points = data.points;
    const labels = points.map((p) => expiryLabel(p.report_date));
    const hasPrice = points.some((p) => p.price != null);
    // open zoomed to the trailing six months
    const zoomStart = Math.max(0, points.length - 26);

    const categoryAxis = {
      type: 'category',
      data: labels,
      axisLine: { lineStyle: { color: AXIS_LINE } },
      axisTick: { lineStyle: { color: AXIS_LINE } },
    };

    const valueAxis = {
      type: 'value',
      nameGap: 14,
      nameTextStyle: axisNameStyle,
      scale: true,
      axisLine: { lineStyle: { color: AXIS_LINE } },
      axisTick: { lineStyle: { color: AXIS_LINE } },
      splitLine: { lineStyle: { color: GRID } },
    };

    const netSeries = COT_CATEGORIES.map((cat, i) => ({
      type: 'line',
      name: cat.name,
      xAxisIndex: 0,
      yAxisIndex: 0,
      data: points.map((p) => p[`${cat.key}_net`]),
      showSymbol: false,
      lineStyle: { width: 1.5, color: cat.color },
      itemStyle: { color: cat.color },
      emphasis: { focus: 'series', lineStyle: { width: 2.5 } },
      endLabel: {
        show: true,
        formatter: '{a}',
        color: cat.color,
        fontFamily: MONO,
        fontSize: 10,
      },
      labelLayout: { hideOverlap: true },
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
    }));

    const priceSeries = hasPrice
      ? [
          {
            type: 'line',
            name: 'BTC',
            xAxisIndex: 1,
            yAxisIndex: 1,
            data: points.map((p) => p.price),
            showSymbol: false,
            connectNulls: false,
            lineStyle: { width: 1, color: ZERO },
            itemStyle: { color: ZERO },
          },
        ]
      : [];

    const opt = {
      backgroundColor: 'transparent',
      legend: {
        top: 4,
        itemWidth: 10,
        itemHeight: 10,
        textStyle: axisLabelStyle,
        data: COT_CATEGORIES.map((c) => c.name),
      },
      tooltip: {
        ...tooltipStyle,
        trigger: 'axis',
        formatter: (params: TooltipItem[]) => {
          const head = params[0]?.axisValueLabel ?? '';
          const rows = params
            .map((s) =>
              s.seriesName === 'BTC'
                ? `${s.marker} ${s.seriesName} ${s.value != null ? usdShort(Number(s.value)) : '—'}`
                : `${s.marker} ${s.seriesName} ${s.value != null ? btcFull(Number(s.value)) : '—'}`,
            )
            .join('<br/>');
          return `${head}<br/>${rows}`;
        },
      },
      axisPointer: { link: [{ xAxisIndex: 'all' }] },
      grid: hasPrice
        ? [
            // the band between the grids must clear the net grid's lowest tick
            // label and the strip's instrument axis name below it (roughly 40px)
            { left: 64, right: 92, top: 32, bottom: '51%' },
            { left: 64, right: 92, top: '57%', bottom: 76 },
          ]
        : [{ left: 64, right: 92, top: 32, bottom: 76 }],
      xAxis: hasPrice
        ? [
            { ...categoryAxis, gridIndex: 0, axisLabel: { show: false } },
            { ...categoryAxis, gridIndex: 1, axisLabel: { ...axisLabelStyle, rotate: 45 } },
          ]
        : [{ ...categoryAxis, gridIndex: 0, axisLabel: { ...axisLabelStyle, rotate: 45 } }],
      yAxis: hasPrice
        ? [
            {
              ...valueAxis,
              gridIndex: 0,
              name: 'NET BTC',
              axisLabel: { ...axisLabelStyle, formatter: btcEquiv },
            },
            {
              ...valueAxis,
              gridIndex: 1,
              name: 'BTC USD',
              axisLabel: { ...axisLabelStyle, formatter: usdShort },
            },
          ]
        : [
            {
              ...valueAxis,
              gridIndex: 0,
              name: 'NET BTC',
              axisLabel: { ...axisLabelStyle, formatter: btcEquiv },
            },
          ],
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: hasPrice ? [0, 1] : [0],
          startValue: zoomStart,
          endValue: points.length - 1,
        },
        {
          type: 'slider',
          xAxisIndex: hasPrice ? [0, 1] : [0],
          startValue: zoomStart,
          endValue: points.length - 1,
          bottom: 6,
          height: 16,
          borderColor: AXIS_LINE,
          fillerColor: 'rgba(255, 176, 0, 0.12)',
          handleStyle: { color: AMBER },
          moveHandleStyle: { color: AMBER },
          dataBackground: {
            lineStyle: { color: GRID },
            areaStyle: { color: 'rgba(36, 49, 51, 0.4)' },
          },
          textStyle: { ...axisLabelStyle, fontSize: 10 },
          brushSelect: false,
        },
      ],
      series: [...netSeries, ...priceSeries],
    };

    return opt as unknown as EChartsOption;
  }, [data]);

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
