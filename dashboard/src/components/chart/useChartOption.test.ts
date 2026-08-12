import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useChartOption } from './useChartOption';

interface Opt {
  series: number[];
}

const opt = (...series: number[]): Opt => ({ series });

const render = (initial: Opt) =>
  renderHook(({ option }) => useChartOption(option), { initialProps: { option: initial } });

describe('useChartOption', () => {
  it('shows the option it was given', () => {
    expect(render(opt(1)).result.current.option.series).toEqual([1]);
  });

  it('passes updates straight through while not held', () => {
    const { result, rerender } = render(opt(1));
    rerender({ option: opt(2) });
    expect(result.current.option.series).toEqual([2]);
  });

  it('keeps showing the old option while held', () => {
    const { result, rerender } = render(opt(1));

    act(() => result.current.hold());
    rerender({ option: opt(2) });

    expect(result.current.option.series).toEqual([1]);
  });

  it('shows the newest option on release', () => {
    const { result, rerender } = render(opt(1));

    act(() => result.current.hold());
    rerender({ option: opt(2) });
    act(() => result.current.release());

    expect(result.current.option.series).toEqual([2]);
  });

  // updates during a hold are not queued: the chart wants the market as it is on release
  it('drops all but the last option arriving during a hold', () => {
    const { result, rerender } = render(opt(1));

    act(() => result.current.hold());
    rerender({ option: opt(2) });
    rerender({ option: opt(3) });
    act(() => result.current.release());

    expect(result.current.option.series).toEqual([3]);
  });

  it('stays put on release when nothing arrived', () => {
    const { result } = render(opt(1));

    act(() => result.current.hold());
    act(() => result.current.release());

    expect(result.current.option.series).toEqual([1]);
  });

  // the reference is what the wrapper hands echarts: same reference, no redraw
  it('keeps the shown reference when an equivalent option arrives', () => {
    const { result, rerender } = render(opt(1));
    const shown = result.current.option;

    rerender({ option: opt(1) });

    expect(result.current.option).toBe(shown);
  });

  it('swaps the reference when the option differs', () => {
    const { result, rerender } = render(opt(1));
    const shown = result.current.option;

    rerender({ option: opt(2) });

    expect(result.current.option).not.toBe(shown);
  });

  it('keeps the reference across a hold that saw only equivalent options', () => {
    const { result, rerender } = render(opt(1));
    const shown = result.current.option;

    act(() => result.current.hold());
    rerender({ option: opt(1) });
    act(() => result.current.release());

    expect(result.current.option).toBe(shown);
  });

  it('animates the first paint only', () => {
    const { result, rerender } = render(opt(1));
    expect(result.current.option.animation).toBe(true);

    rerender({ option: opt(2) });
    expect(result.current.option.animation).toBe(false);

    rerender({ option: opt(3) });
    expect(result.current.option.animation).toBe(false);
  });
});
