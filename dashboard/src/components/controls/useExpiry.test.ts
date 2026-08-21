import { act, renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';

import { SettingsProvider, useChartScope } from '../../settings/store';
import { EXPIRY_ALL } from '../../utils/expiry';
import { useExpiry } from './useExpiry';

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(SettingsProvider, null, children);

// Fridays; the first is a month-end, matching the monthly default
const WEEK1 = '2026-07-31T08:00:00Z';
const WEEK2 = '2026-08-07T08:00:00Z';
const MONTHLY2 = '2026-08-28T08:00:00Z';

const CHART = 'testChart';

function useHarness(expiries: string[], opts?: { allowAll?: boolean }) {
  return { selected: useExpiry(CHART, expiries, opts), control: useChartScope(CHART) };
}

beforeEach(() => localStorage.clear());

describe('useExpiry', () => {
  it('follows the front expiry by default', () => {
    const { result } = renderHook(() => useHarness([WEEK1, WEEK2]), { wrapper });
    expect(result.current.selected).toBe(WEEK1);
  });

  it('tracks the tenor of an auto pick', () => {
    const { result } = renderHook(() => useHarness([WEEK2, MONTHLY2]), { wrapper });
    // no allowAll, so the default EXPIRY_ALL resolves through its monthly tenor
    expect(result.current.selected).toBe(MONTHLY2);
    act(() => result.current.control.update({ expiry: 'weekly' }));
    expect(result.current.selected).toBe(WEEK2);
  });

  it('holds a concrete pick from settings', () => {
    const { result } = renderHook(() => useHarness([WEEK1, WEEK2]), { wrapper });
    act(() => result.current.control.update({ expiry: WEEK2 }));
    expect(result.current.selected).toBe(WEEK2);
  });

  it('falls back to the front expiry when the pick rolls off the chain', () => {
    const { result, rerender } = renderHook((expiries: string[]) => useHarness(expiries), {
      wrapper,
      initialProps: [WEEK1, WEEK2],
    });
    act(() => result.current.control.update({ expiry: WEEK1 }));
    rerender([WEEK2]);
    expect(result.current.selected).toBe(WEEK2);
  });

  it('has nothing selected while the chain is empty', () => {
    const { result } = renderHook(() => useHarness([]), { wrapper });
    expect(result.current.selected).toBeNull();
  });

  describe('with allowAll', () => {
    it('maps EXPIRY_ALL to the empty string', () => {
      const { result } = renderHook(() => useHarness([WEEK1], { allowAll: true }), { wrapper });
      act(() => result.current.control.update({ expiry: EXPIRY_ALL }));
      expect(result.current.selected).toBe('');
    });

    it('selects every expiry by default', () => {
      const { result } = renderHook(() => useHarness([WEEK1, WEEK2], { allowAll: true }), {
        wrapper,
      });
      expect(result.current.selected).toBe('');
    });

    it('still falls back to a front expiry once a concrete pick is made', () => {
      const { result } = renderHook(() => useHarness([WEEK1, WEEK2], { allowAll: true }), {
        wrapper,
      });
      act(() => result.current.control.update({ expiry: WEEK2 }));
      expect(result.current.selected).toBe(WEEK2);
    });

    it('selects all when the chain is empty', () => {
      const { result } = renderHook(() => useHarness([], { allowAll: true }), { wrapper });
      expect(result.current.selected).toBe('');
    });
  });

  it('treats EXPIRY_ALL as the front expiry without allowAll', () => {
    const { result } = renderHook(() => useHarness([WEEK1]), { wrapper });
    act(() => result.current.control.update({ expiry: EXPIRY_ALL }));
    expect(result.current.selected).toBe(WEEK1);
  });
});
