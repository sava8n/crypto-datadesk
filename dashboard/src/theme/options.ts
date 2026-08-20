// Typed ECharts fragments. Charts compose these instead of hand-rolling an untyped
// literal, which is what lets an option be annotated EChartsOption with no cast.

import type {
  GridComponentOption,
  DefaultLabelFormatterCallbackParams as ItemParams,
  LegendComponentOption,
  MarkLineComponentOption,
  TooltipComponentOption,
  XAXisComponentOption,
  YAXisComponentOption,
} from 'echarts';

import { axisLabelStyle, C, MONO, tooltipStyle } from './charts';

export interface AxisOpts {
  name?: string;
  nameGap?: number;
  format?: (v: number) => string;
  scale?: boolean;
  min?: number;
  max?: number;
  // paint line, ticks, labels and name in one accent colour
  accent?: string;
  position?: 'right';
  splitLine?: boolean;
}

const nameStyle = (o: AxisOpts) => ({
  color: o.accent ?? C.text,
  fontFamily: MONO,
  fontSize: 13,
});

function valueBase(o: AxisOpts) {
  return {
    type: 'value' as const,
    ...(o.scale && { scale: true }),
    ...(o.min !== undefined && { min: o.min }),
    ...(o.max !== undefined && { max: o.max }),
    axisLine: { lineStyle: { color: o.accent ?? C.axis } },
    axisTick: { lineStyle: { color: o.accent ?? C.axis } },
    axisLabel: {
      ...axisLabelStyle(),
      ...(o.accent && { color: o.accent }),
      ...(o.format && { formatter: o.format }),
    },
    splitLine:
      o.splitLine === false
        ? { show: false }
        : { lineStyle: { color: C.grid, type: 'dashed' as const } },
  };
}

export const valueAxisY = (o: AxisOpts = {}): YAXisComponentOption => ({
  ...valueBase(o),
  ...(o.position && { position: o.position }),
  ...(o.name !== undefined && {
    name: o.name,
    nameGap: o.nameGap ?? 12,
    nameTextStyle: nameStyle(o),
  }),
});

export const valueAxisX = (o: AxisOpts = {}): XAXisComponentOption => ({
  ...valueBase(o),
  ...(o.name !== undefined && {
    name: o.name,
    nameLocation: 'middle',
    nameGap: o.nameGap ?? 28,
    nameTextStyle: nameStyle(o),
  }),
});

// history panels: ISO timestamps plotted proportionally in time
export const timeAxisX = (): XAXisComponentOption => ({
  type: 'time',
  axisLine: { lineStyle: { color: C.axis } },
  axisTick: { lineStyle: { color: C.axis } },
  axisLabel: axisLabelStyle(),
  splitLine: { lineStyle: { color: C.grid, type: 'dashed' as const } },
});

export const categoryAxisX = (
  data: string[],
  o: { rotate?: number; interval?: number | 'auto' } = {},
): XAXisComponentOption => ({
  type: 'category',
  data,
  axisLine: { lineStyle: { color: C.axis } },
  axisTick: { lineStyle: { color: C.axis } },
  axisLabel: {
    ...axisLabelStyle(),
    rotate: o.rotate ?? 45,
    interval: o.interval ?? 'auto',
  },
});

// Grid insets. The differences are load-bearing: currency-labelled axes need a deeper left
// gutter and a scrolling per-expiry legend needs two rows of headroom.
export const GRID_INSETS = {
  bars: { left: 56, right: 18, top: 40, bottom: 60 },
  barsWide: { left: 68, right: 18, top: 40, bottom: 60 },
  curves: { left: 56, right: 18, top: 66, bottom: 44 },
  series: { left: 56, right: 18, top: 40, bottom: 44 },
} as const;

export const grid = (
  preset: keyof typeof GRID_INSETS,
  override: Partial<GridComponentOption> = {},
): GridComponentOption => ({ ...GRID_INSETS[preset], ...override });

export const legendBar = (data: string[]): LegendComponentOption => ({
  data,
  top: 4,
  itemWidth: 10,
  itemHeight: 10,
  inactiveColor: C.zero,
  textStyle: axisLabelStyle(),
});

// one entry per expiry, so it has to page rather than wrap
export const legendScroll = (data: string[]): LegendComponentOption => ({
  data,
  type: 'scroll',
  top: 6,
  left: 10,
  right: 10,
  itemWidth: 18,
  itemHeight: 2,
  itemGap: 12,
  inactiveColor: C.zero,
  textStyle: { ...axisLabelStyle(), fontSize: 11 },
  pageTextStyle: { color: C.text, fontFamily: MONO },
  pageIconColor: C.text,
  pageIconInactiveColor: C.axis,
});

// dashed rule at y = 0 under a signed series
export const zeroLine = (): MarkLineComponentOption => ({
  symbol: 'none',
  silent: true,
  lineStyle: { color: C.zero, type: 'dashed', width: 1.5 },
  label: { show: false },
  data: [{ yAxis: 0 }],
});

// echarts types formatter params as an item/axis union and values as unknown, both
// wider than any chart needs; these adapters narrow once instead of per chart.

// the numeric tuple a series datum carries, or [] when echarts hands back something else
export const tuple = (v: unknown): number[] => (Array.isArray(v) ? v.map(Number) : []);

export const render =
  (fn: (p: ItemParams) => string): NonNullable<TooltipComponentOption['formatter']> =>
  (params) => {
    const p = Array.isArray(params) ? params[0] : params;
    return p ? fn(p as ItemParams) : '';
  };

export const values =
  (fmt: (v: number) => string): NonNullable<TooltipComponentOption['valueFormatter']> =>
  (v) =>
    fmt(Number(v));

export const itemTooltip = (fn: (p: ItemParams) => string): TooltipComponentOption => ({
  ...tooltipStyle(),
  trigger: 'item',
  formatter: render(fn),
});

export const axisTooltip = (
  o: { shadow?: boolean; value?: (v: number) => string; render?: (p: ItemParams) => string } = {},
): TooltipComponentOption => ({
  ...tooltipStyle(),
  trigger: 'axis',
  // echarts' own pointer colour is fixed for a light page
  axisPointer: o.shadow
    ? { type: 'shadow' }
    : { type: 'line', lineStyle: { color: C.label, type: 'dashed' } },
  ...(o.value && { valueFormatter: values(o.value) }),
  ...(o.render && { formatter: render(o.render) }),
});
