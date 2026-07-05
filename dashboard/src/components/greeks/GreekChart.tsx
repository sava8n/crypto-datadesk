import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

import { useGreeksChain } from '../../hooks/useGreeksChain';
import type { GreekName } from '../../api/client';
import { strikeFmt } from '../../utils/format';
import {
  AXIS_LINE,
  GRID,
  axisLabelStyle,
  axisNameStyle,
  tooltipStyle,
} from '../../theme/charts';

interface Props {
  greek: GreekName;
  label: string;
  color: string;
  currency: string;
  selectedExpiry: string | null;
  valueFmt: (v: number) => string;
}

interface ChartPoint {
  strike: number;
  value: number;
}

// One greek line (value vs strike) for a single expiry. Points are sorted by
// strike, then value, so at the ATM crossover the OTM put (negative) precedes
// the OTM call (positive) — reproducing delta's sign flip as a clean spike.
function buildOption(
  points: ChartPoint[],
  color: string,
  label: string,
  valueFmt: (v: number) => string,
): EChartsOption {
  const data = points
    .slice()
    .sort((a, b) => a.strike - b.strike || a.value - b.value)
    .map((p) => [p.strike, p.value] as [number, number]);

  // compact panels in a 2x2 grid, so one point smaller than the shared styles
  const labelStyle = { ...axisLabelStyle, fontSize: 10 };
  const nameStyle = { ...axisNameStyle, fontSize: 12 };

  const opt = {
    backgroundColor: 'transparent',
    tooltip: {
      ...tooltipStyle,
      trigger: 'item',
      formatter: (p: { value?: number[] }) => {
        const arr = p.value ?? [];
        if (arr.length < 2) return '';
        const [k, v] = arr;
        return `${label}<br/>K ${k.toLocaleString('en-US')}<br/>${valueFmt(v)}`;
      },
    },
    grid: { left: 68, right: 16, top: 16, bottom: 40 },
    xAxis: {
      type: 'value',
      name: 'STRIKE',
      nameLocation: 'middle',
      nameGap: 26,
      nameTextStyle: nameStyle,
      scale: true,
      axisLine: { lineStyle: { color: AXIS_LINE } },
      axisTick: { lineStyle: { color: AXIS_LINE } },
      axisLabel: { ...labelStyle, formatter: strikeFmt },
      splitLine: { lineStyle: { color: GRID } },
    },
    yAxis: {
      type: 'value',
      scale: true,
      axisLine: { lineStyle: { color: AXIS_LINE } },
      axisTick: { lineStyle: { color: AXIS_LINE } },
      axisLabel: { ...labelStyle, formatter: valueFmt },
      splitLine: { lineStyle: { color: GRID } },
    },
    series: [
      {
        type: 'line',
        name: label,
        data,
        showSymbol: false,
        smooth: true,
        itemStyle: { color },
        lineStyle: { color, width: 1.5 },
        emphasis: { focus: 'series', lineStyle: { width: 3 } },
      },
    ],
  };

  return opt as unknown as EChartsOption;
}

export default function GreekChart({
  greek,
  label,
  color,
  currency,
  selectedExpiry,
  valueFmt,
}: Props) {
  const query = useGreeksChain(currency);

  const points = useMemo<ChartPoint[]>(() => {
    if (!query.data || !selectedExpiry) return [];
    return query.data.points
      .filter((p) => p.expiry === selectedExpiry)
      .map((p) => ({ strike: p.strike, value: p[greek] }));
  }, [query.data, selectedExpiry, greek]);

  const option = useMemo(
    () => buildOption(points, color, label, valueFmt),
    [points, color, label, valueFmt],
  );

  return (
    <section className="panel greek-panel">
      <div className="panel__title">
        <span className="panel__title-main">{label}</span>
        <span className="panel__title-sub">{greek.toUpperCase()} × STRIKE</span>
      </div>
      <div className="panel__body">
        {query.isLoading && <div className="panel__msg">LOADING {label}…</div>}
        {query.isError && (
          <div className="panel__msg panel__msg--err">
            ERR · {query.error?.message ?? 'REQUEST FAILED'}
          </div>
        )}
        {!query.isLoading && !query.isError && points.length < 2 && (
          <div className="panel__msg panel__msg--warn">INSUFFICIENT DATA · {points.length} PTS</div>
        )}
        {!query.isLoading && !query.isError && points.length >= 2 && (
          <ReactECharts
            option={option}
            notMerge
            lazyUpdate
            style={{ width: '100%', height: '100%' }}
            opts={{ renderer: 'canvas' }}
          />
        )}
      </div>
    </section>
  );
}
