import { describe, it, expect } from 'vitest';
import { AMBER, AXIS_LINE, GRID } from './charts';
import { GRID_INSETS, categoryAxisX, grid, tuple, valueAxisX, valueAxisY } from './options';

describe('valueAxisY', () => {
  it('uses the shared line and gridline colours', () => {
    const axis = valueAxisY() as Record<string, never>;
    expect(axis).toMatchObject({
      type: 'value',
      axisLine: { lineStyle: { color: AXIS_LINE } },
      axisTick: { lineStyle: { color: AXIS_LINE } },
      splitLine: { lineStyle: { color: GRID } },
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

  it('drops a point in compact panels', () => {
    const normal = valueAxisY({ name: 'IV' }) as Record<string, never>;
    const compact = valueAxisY({ name: 'IV', compact: true }) as Record<string, never>;
    expect((normal.axisLabel as { fontSize: number }).fontSize).toBe(11);
    expect((compact.axisLabel as { fontSize: number }).fontSize).toBe(10);
    expect((normal.nameTextStyle as { fontSize: number }).fontSize).toBe(13);
    expect((compact.nameTextStyle as { fontSize: number }).fontSize).toBe(12);
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
    expect(axis.axisLabel).toMatchObject({ rotate: 45, interval: 'auto', color: AMBER });
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
