import { afterEach, describe, expect, it } from 'vitest';
import { colors, setChartTheme, THEMES } from './charts';
import { DEFAULT_THEME, type ThemeMode } from './mode';
import {
  axisTooltip,
  categoryAxisX,
  GRID_INSETS,
  grid,
  legendBar,
  markLine,
  spotMark,
  timeZoom,
  tuple,
  valueAxisX,
  valueAxisY,
  zeroLine,
  zeroMark,
} from './options';

const OTHER: ThemeMode = DEFAULT_THEME === 'dark' ? 'light' : 'dark';

afterEach(() => setChartTheme(DEFAULT_THEME));

describe('valueAxisY', () => {
  it('uses the shared line and gridline colours', () => {
    const axis = valueAxisY() as Record<string, never>;
    expect(axis).toMatchObject({
      type: 'value',
      axisLine: { lineStyle: { color: colors.axis } },
      axisTick: { lineStyle: { color: colors.axis } },
      splitLine: { lineStyle: { color: colors.grid } },
    });
  });

  it('omits the name block entirely when unnamed', () => {
    expect(valueAxisY()).not.toHaveProperty('name');
    expect(valueAxisY()).not.toHaveProperty('nameTextStyle');
  });

  it('attaches a formatter and the default name gap', () => {
    const axis = valueAxisY({ name: 'OI', format: (v) => `${v}!` }) as Record<string, never>;
    expect(axis).toMatchObject({ name: 'OI', nameGap: 12 });
    expect((axis.axisLabel as { formatter: (v: number) => string }).formatter(3)).toBe('3!');
  });

  it('paints line, ticks, labels and name in one accent', () => {
    const accent = '#ff3b30';
    const axis = valueAxisY({ name: 'INTRINSIC', accent }) as Record<string, never>;
    expect(axis).toMatchObject({
      axisLine: { lineStyle: { color: accent } },
      axisTick: { lineStyle: { color: accent } },
      axisLabel: { color: accent },
      nameTextStyle: { color: accent },
    });
  });

  it('can hide the gridlines and sit on the right', () => {
    expect(valueAxisY({ splitLine: false, position: 'right' })).toMatchObject({
      splitLine: { show: false },
      position: 'right',
    });
  });

  it('passes scale and explicit bounds through', () => {
    expect(valueAxisY({ scale: true, min: 0, max: 1 })).toMatchObject({
      scale: true,
      min: 0,
      max: 1,
    });
  });
});

describe('valueAxisX', () => {
  it('centres its name below the axis', () => {
    expect(valueAxisX({ name: 'DTE' })).toMatchObject({
      name: 'DTE',
      nameLocation: 'middle',
      nameGap: 28,
    });
  });
});

describe('categoryAxisX', () => {
  it('carries the labels and rotates them by default', () => {
    const axis = categoryAxisX(['a', 'b']) as Record<string, never>;
    expect(axis).toMatchObject({ type: 'category', data: ['a', 'b'] });
    expect(axis.axisLabel).toMatchObject({ rotate: 45, interval: 'auto', color: colors.label });
  });

  it('can force a label on every category', () => {
    const axis = categoryAxisX(['a'], { interval: 0 }) as Record<string, never>;
    expect((axis.axisLabel as { interval: number }).interval).toBe(0);
  });
});

describe('grid', () => {
  it('returns the named preset', () => {
    expect(grid('bars')).toEqual(GRID_INSETS.bars);
  });

  it('applies overrides without mutating the preset', () => {
    expect(grid('bars', { right: 64 })).toEqual({ ...GRID_INSETS.bars, right: 64 });
    expect(GRID_INSETS.bars.right).toBe(18);
  });

  it('gives currency-labelled axes a deeper left gutter', () => {
    expect(GRID_INSETS.barsWide.left).toBeGreaterThan(GRID_INSETS.bars.left);
  });

  it('leaves a history chart room for a right axis and the zoom slider', () => {
    expect(GRID_INSETS.history.right).toBeGreaterThan(GRID_INSETS.series.right);
    expect(GRID_INSETS.history.bottom).toBeGreaterThan(GRID_INSETS.series.bottom);
  });
});

describe('markLine', () => {
  it('wraps level entries in one silent line', () => {
    expect(markLine([zeroMark(), spotMark(3)])).toMatchObject({
      silent: true,
      data: [{ yAxis: 0 }, { xAxis: 3, label: { formatter: 'SPOT' } }],
    });
  });

  it('builds the zero line from its entry', () => {
    expect(zeroLine().data).toEqual([zeroMark()]);
  });
});

describe('timeZoom', () => {
  it('pairs an inside zoom with a slider and sets no range', () => {
    const zoom = timeZoom() as { type: string; start?: number; end?: number }[];
    expect(zoom.map((z) => z.type)).toEqual(['inside', 'slider']);
    for (const z of zoom) {
      expect(z).not.toHaveProperty('start');
      expect(z).not.toHaveProperty('end');
    }
  });

  it('keeps the slider flush with the history grid, overrides included', () => {
    expect(timeZoom()[1]).toMatchObject({
      left: GRID_INSETS.history.left,
      right: GRID_INSETS.history.right,
    });
    expect(timeZoom({ left: 68 })[1]).toMatchObject({ left: 68, right: GRID_INSETS.history.right });
  });

  it('leaves the wheel to the page unless ctrl is held', () => {
    expect(timeZoom()[0]).toMatchObject({ type: 'inside', zoomOnMouseWheel: 'ctrl' });
  });
});

describe('token freshness', () => {
  // the fragments are built per call, so a theme switch reaches them without a re-import
  it('follows a theme switch', () => {
    setChartTheme(OTHER);
    const t = THEMES[OTHER];
    expect(legendBar([]).textStyle).toMatchObject({ color: t.label });
    expect(legendBar([]).inactiveColor).toBe(t.zero);
    expect(axisTooltip().backgroundColor).toBe(t.tooltipBg);
    expect(valueAxisY()).toMatchObject({ axisLine: { lineStyle: { color: t.axis } } });
  });
});

describe('tuple', () => {
  it('coerces a datum array to numbers', () => {
    expect(tuple([1, '2'])).toEqual([1, 2]);
  });

  it('returns an empty list for a non-array datum', () => {
    expect(tuple(undefined)).toEqual([]);
    expect(tuple(7)).toEqual([]);
  });
});
