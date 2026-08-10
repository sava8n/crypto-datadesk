// Typed ECharts fragments. Charts compose these instead of hand-rolling an untyped
// literal, which is what lets an option be annotated EChartsOption with no cast.

import type {
  DefaultLabelFormatterCallbackParams as ItemParams,
  GridComponentOption,
  LegendComponentOption,
  TooltipComponentOption,
  XAXisComponentOption,
  YAXisComponentOption,
} from 'echarts';

import { ACCENT, AXIS_LINE, GRID, MONO, MUTED, TEXT, axisLabelStyle, tooltipStyle } from './charts';

export interface AxisOpts {
  name?: string;
  nameGap?: number;
  format?: (v: number) => string;
  scale?: boolean;
  min?: number;
  max?: number;
  // mini-panel type sizes
  compact?: boolean;
  // paint line, ticks, labels and name in one accent colour
  accent?: string;
  position?: 'right';
  splitLine?: boolean;
}

const labelSize = (o: AxisOpts) => (o.compact ? 10 : 11);
const nameSize = (o: AxisOpts) => (o.compact ? 12 : 13);
const nameStyle = (o: AxisOpts) => ({
  color: o.accent ?? TEXT,
  fontFamily: MONO,
  fontSize: nameSize(o),
});

function valueBase(o: AxisOpts) {
  return {
    type: 'value' as const,
    ...(o.scale && { scale: true }),
    ...(o.min !== undefined && { min: o.min }),
    ...(o.max !== undefined && { max: o.max }),
    axisLine: { lineStyle: { color: o.accent ?? AXIS_LINE } },
    axisTick: { lineStyle: { color: o.accent ?? AXIS_LINE } },
    axisLabel: {
      color: o.accent ?? MUTED,
      fontFamily: MONO,
      fontSize: labelSize(o),
      ...(o.format && { formatter: o.format }),
    },
    splitLine: o.splitLine === false ? { show: false } : { lineStyle: { color: GRID } },
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
export const timeAxisX = (o: { compact?: boolean } = {}): XAXisComponentOption => ({
  type: 'time',
  axisLine: { lineStyle: { color: AXIS_LINE } },
  axisTick: { lineStyle: { color: AXIS_LINE } },
  axisLabel: { color: MUTED, fontFamily: MONO, fontSize: o.compact ? 10 : 11 },
  splitLine: { lineStyle: { color: GRID } },
});

export const categoryAxisX = (
  data: string[],
  o: { rotate?: number; interval?: number | 'auto'; compact?: boolean } = {},
): XAXisComponentOption => ({
  type: 'category',
  data,
  axisLine: { lineStyle: { color: AXIS_LINE } },
  axisTick: { lineStyle: { color: AXIS_LINE } },
  axisLabel: {
    color: MUTED,
    fontFamily: MONO,
    fontSize: o.compact ? 10 : 11,
    rotate: o.rotate ?? 45,
    interval: o.interval ?? 'auto',
  },
});

// Grid insets. The differences are load-bearing: wide currency labels need a deeper
// left gutter and a legend-less chart reclaims the headroom.
export const GRID_INSETS = {
  bars: { left: 56, right: 18, top: 40, bottom: 60 },
  // wider gutter where the y labels are full currency amounts
  barsWide: { left: 68, right: 18, top: 40, bottom: 60 },
  // no legend, so the headroom comes back
  noLegend: { left: 56, right: 18, top: 30, bottom: 60 },
  // a scrolling per-expiry legend needs two rows
  curves: { left: 56, right: 18, top: 66, bottom: 44 },
  series: { left: 56, right: 18, top: 40, bottom: 44 },
  mini: { left: 56, right: 16, top: 16, bottom: 40 },
  miniWide: { left: 68, right: 16, top: 16, bottom: 40 },
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
  textStyle: axisLabelStyle,
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
  textStyle: { color: TEXT, fontFamily: MONO, fontSize: 10 },
  pageTextStyle: { color: ACCENT, fontFamily: MONO },
  pageIconColor: ACCENT,
  pageIconInactiveColor: AXIS_LINE,
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
  ...tooltipStyle,
  trigger: 'item',
  formatter: render(fn),
});

export const axisTooltip = (
  o: { shadow?: boolean; value?: (v: number) => string; render?: (p: ItemParams) => string } = {},
): TooltipComponentOption => ({
  ...tooltipStyle,
  trigger: 'axis',
  ...(o.shadow && { axisPointer: { type: 'shadow' } }),
  ...(o.value && { valueFormatter: values(o.value) }),
  ...(o.render && { formatter: render(o.render) }),
});
