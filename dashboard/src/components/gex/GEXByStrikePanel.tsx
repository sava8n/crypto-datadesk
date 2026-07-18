import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

import type { GEXByStrikeResponse } from '../../types';
import { strikeFmt, usdFull, usdShort } from '../../utils/format';
import { nearestIdx } from './nearest';
import {
  AXIS_LINE,
  CALL,
  FLIP,
  GRID,
  PUT,
  axisLabelStyle,
  axisNameStyle,
  tooltipStyle,
} from '../../theme/charts';

const NET = '#b06cf0';

export default function GEXByStrikePanel({ data }: { data: GEXByStrikeResponse }) {
  const option = useMemo<EChartsOption>(() => {
    const rows = [...data.points].sort((a, b) => a.strike - b.strike);
    const strikes = rows.map((p) => p.strike);
    const labels = strikes.map(strikeFmt);

    const flipIdx = data.flip != null ? nearestIdx(strikes, data.flip) : -1;

    const markLineData: unknown[] = [];
    if (flipIdx >= 0) {
      markLineData.push({
        xAxis: flipIdx,
        lineStyle: { color: FLIP, type: 'dashed', width: 1 },
        label: {
          ...axisLabelStyle,
          color: FLIP,
          formatter: () => `Flip ${usdFull(data.flip as number)}`,
        },
      });
    }

    const opt = {
      backgroundColor: 'transparent',
      legend: {
        data: ['Call GEX', 'Put GEX', 'Net GEX'],
        top: 4,
        itemWidth: 10,
        itemHeight: 10,
        textStyle: axisLabelStyle,
      },
      tooltip: {
        ...tooltipStyle,
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        valueFormatter: (v: number | string) => usdShort(Number(v)),
      },
      grid: { left: 68, right: 18, top: 40, bottom: 60 },
      xAxis: {
        type: 'category',
        data: labels,
        axisLine: { lineStyle: { color: AXIS_LINE } },
        axisTick: { lineStyle: { color: AXIS_LINE } },
        axisLabel: { ...axisLabelStyle, rotate: 45, interval: 'auto' },
      },
      yAxis: {
        type: 'value',
        name: 'GEX / 1%',
        nameGap: 12,
        nameTextStyle: axisNameStyle,
        axisLine: { lineStyle: { color: AXIS_LINE } },
        axisTick: { lineStyle: { color: AXIS_LINE } },
        axisLabel: { ...axisLabelStyle, formatter: usdShort },
        splitLine: { lineStyle: { color: GRID } },
      },
      series: [
        {
          type: 'bar',
          name: 'Call GEX',
          stack: 'gex',
          barMaxWidth: 22,
          data: rows.map((p) => p.call_gex),
          itemStyle: { color: CALL },
          emphasis: { focus: 'series' },
        },
        {
          type: 'bar',
          name: 'Put GEX',
          stack: 'gex',
          barMaxWidth: 22,
          data: rows.map((p) => p.put_gex),
          itemStyle: { color: PUT },
          emphasis: { focus: 'series' },
        },
        {
          type: 'line',
          name: 'Net GEX',
          data: rows.map((p) => p.net_gex),
          showSymbol: false,
          smooth: true,
          itemStyle: { color: NET },
          lineStyle: { color: NET, width: 1.5 },
          emphasis: { focus: 'series' },
          markLine: {
            symbol: 'none',
            silent: true,
            data: markLineData,
          },
        },
      ],
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
