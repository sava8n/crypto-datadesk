import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

import type { GEXByStrikeResponse } from '../../types';
import { strikeFmt, usdFull, usdShort } from '../../utils/format';
import {
  AMBER,
  AXIS_LINE,
  GRID,
  axisLabelStyle,
  axisNameStyle,
  tooltipStyle,
} from '../../theme/charts';

const CALL = '#5fded0';
const PUT = '#ffcf4d';
const NET = '#b06cf0';
const FLIP = '#ff3b30';

// nearest strike category for a price level that falls between strikes.
function nearestIdx(strikes: number[], level: number): number {
  let best = -1;
  let bestDist = Infinity;
  strikes.forEach((k, i) => {
    const d = Math.abs(k - level);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  });
  return best;
}

export default function GEXByStrikePanel({ data }: { data: GEXByStrikeResponse }) {
  const option = useMemo<EChartsOption>(() => {
    const rows = [...data.points].sort((a, b) => a.strike - b.strike);
    const strikes = rows.map((p) => p.strike);
    const labels = strikes.map(strikeFmt);

    const spotIdx = nearestIdx(strikes, data.spot);
    const flipIdx = data.flip != null ? nearestIdx(strikes, data.flip) : -1;

    // spot and flip often sit on adjacent strikes: anchor each label away from
    // the other line (left line's text extends left, right line's right)
    const spotIsLeft = data.flip == null || data.spot <= data.flip;

    const markLineData: unknown[] = [];
    if (spotIdx >= 0) {
      markLineData.push({
        xAxis: spotIdx,
        lineStyle: { color: AMBER, type: 'dashed', width: 1 },
        label: {
          ...axisLabelStyle,
          align: data.flip == null ? 'center' : spotIsLeft ? 'right' : 'left',
          padding: [0, 4],
          formatter: () => `Spot ${usdFull(data.spot)}`,
        },
      });
    }
    if (flipIdx >= 0) {
      markLineData.push({
        xAxis: flipIdx,
        lineStyle: { color: FLIP, type: 'dashed', width: 1 },
        label: {
          ...axisLabelStyle,
          color: FLIP,
          align: spotIsLeft ? 'left' : 'right',
          padding: [0, 4],
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
