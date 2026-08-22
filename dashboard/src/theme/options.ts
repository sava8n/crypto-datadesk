// Typed ECharts fragments, so an option can be annotated EChartsOption with no cast.

import type {
  DataZoomComponentOption,
  GridComponentOption,
  DefaultLabelFormatterCallbackParams as ItemParams,
  LegendComponentOption,
  MarkLineComponentOption,
  TooltipComponentOption,
  XAXisComponentOption,
  YAXisComponentOption,
} from 'echarts';

import { axisLabelStyle, colors, MONO, tooltipStyle } from './charts';

export interface AxisOpts {
  name?: string;
  nameGap?: number;
  format?: (v: number) => string;
  scale?: boolean;
  min?: number;
  max?: number;
  accent?: string;
  position?: 'right';
  splitLine?: boolean;
}

const nameStyle = (o: AxisOpts) => ({
  color: o.accent ?? colors.text,
  fontFamily: MONO,
  fontSize: 13,
});

function valueBase(o: AxisOpts) {
  return {
    type: 'value' as const,
    ...(o.scale && { scale: true }),
    ...(o.min !== undefined && { min: o.min }),
    ...(o.max !== undefined && { max: o.max }),
    axisLine: { lineStyle: { color: o.accent ?? colors.axis } },
    axisTick: { lineStyle: { color: o.accent ?? colors.axis } },
    axisLabel: {
      ...axisLabelStyle(),
      ...(o.accent && { color: o.accent }),
      ...(o.format && { formatter: o.format }),
    },
    splitLine:
      o.splitLine === false
        ? { show: false }
        : { lineStyle: { color: colors.grid, type: 'dashed' as const } },
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

export const timeAxisX = (): XAXisComponentOption => ({
  type: 'time',
  axisLine: { lineStyle: { color: colors.axis } },
  axisTick: { lineStyle: { color: colors.axis } },
  axisLabel: axisLabelStyle(),
  splitLine: { lineStyle: { color: colors.grid, type: 'dashed' as const } },
});

export const categoryAxisX = (
  data: string[],
  o: { rotate?: number; interval?: number | 'auto' } = {},
): XAXisComponentOption => ({
  type: 'category',
  data,
  axisLine: { lineStyle: { color: colors.axis } },
  axisTick: { lineStyle: { color: colors.axis } },
  axisLabel: {
    ...axisLabelStyle(),
    rotate: o.rotate ?? 45,
    interval: o.interval ?? 'auto',
  },
});

export const GRID_INSETS = {
  bars: { left: 56, right: 18, top: 40, bottom: 60 },
  barsWide: { left: 68, right: 18, top: 40, bottom: 60 },
  curves: { left: 56, right: 18, top: 66, bottom: 44 },
  series: { left: 56, right: 18, top: 40, bottom: 44 },
  history: { left: 56, right: 64, top: 40, bottom: 88 },
} as const;

export const grid = (
  preset: keyof typeof GRID_INSETS,
  override: Partial<GridComponentOption> = {},
): GridComponentOption => ({ ...GRID_INSETS[preset], ...override });

export const legendBar = (data: string[]): LegendComponentOption => ({
  data,
  top: 4,
  icon: 'roundRect',
  itemWidth: 10,
  itemHeight: 10,
  inactiveColor: colors.zero,
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
  inactiveColor: colors.zero,
  textStyle: { ...axisLabelStyle(), fontSize: 11 },
  pageTextStyle: { color: colors.text, fontFamily: MONO },
  pageIconColor: colors.text,
  pageIconInactiveColor: colors.axis,
});

type MarkLineDatum = NonNullable<MarkLineComponentOption['data']>[number];

export const markLine = (data: MarkLineDatum[]): MarkLineComponentOption => ({
  symbol: 'none',
  silent: true,
  data,
});

export const zeroMark = (): MarkLineDatum => ({
  yAxis: 0,
  lineStyle: { color: colors.zero, type: 'dashed', width: 1.5 },
  label: { show: false },
});

export const zeroLine = (): MarkLineComponentOption => markLine([zeroMark()]);

export const spotMark = (idx: number): MarkLineDatum => ({
  xAxis: idx,
  lineStyle: { color: colors.label, type: 'dashed', width: 1 },
  label: { color: colors.label, fontFamily: MONO, fontSize: 10, formatter: 'SPOT' },
});

/**
 * Inside zoom plus a slider under the time axis. No start/end: the component keeps the range
 * the user set across the merged option updates. Wheel zoom needs ctrl, so the page still
 * scrolls over a column of panels. `inset` follows a grid override so the slider stays flush.
 */
export const timeZoom = (
  inset: { left?: number; right?: number } = {},
): DataZoomComponentOption[] => [
  { type: 'inside', zoomOnMouseWheel: 'ctrl', moveOnMouseMove: true },
  {
    type: 'slider',
    height: 32,
    bottom: 8,
    left: inset.left ?? GRID_INSETS.history.left,
    right: inset.right ?? GRID_INSETS.history.right,
    showDetail: false,
    brushSelect: false,
    borderColor: colors.axis,
    backgroundColor: 'transparent',
    fillerColor: colors.sparkFill,
    dataBackground: { lineStyle: { color: colors.axis }, areaStyle: { color: colors.grid } },
    selectedDataBackground: {
      lineStyle: { color: colors.label },
      areaStyle: { color: colors.sparkFill },
    },
    handleStyle: { color: colors.tooltipBg, borderColor: colors.text },
    moveHandleStyle: { color: colors.axis },
    textStyle: axisLabelStyle(),
  },
];

// echarts types formatter params as an item/axis union and values as unknown; narrow once here

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
    : { type: 'line', lineStyle: { color: colors.label, type: 'dashed' } },
  ...(o.value && { valueFormatter: values(o.value) }),
  ...(o.render && { formatter: render(o.render) }),
});
