import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';

import { SettingsProvider } from '../../settings/store';
import { useExpiryPicker } from './useExpiryPicker';

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(SettingsProvider, null, children);

// default settings prefer the weekly front expiry; these are Fridays
const WEEK1 = '2026-07-31T08:00:00Z';
const WEEK2 = '2026-08-07T08:00:00Z';

describe('useExpiryPicker', () => {
  it('tracks the front expiry until the user picks one', () => {
    const { result } = renderHook(() => useExpiryPicker([WEEK1, WEEK2]), { wrapper });
    expect(result.current.selected).toBe(WEEK1);
  });

  it('holds an explicit pick', () => {
    const { result } = renderHook(() => useExpiryPicker([WEEK1, WEEK2]), { wrapper });
    act(() => result.current.select(WEEK2));
    expect(result.current.selected).toBe(WEEK2);
  });

  it('keeps the pick while it is still quoted', () => {
    const { result, rerender } = renderHook((expiries: string[]) => useExpiryPicker(expiries), {
      wrapper,
      initialProps: [WEEK1, WEEK2],
    });
    act(() => result.current.select(WEEK2));
    rerender([WEEK1, WEEK2]);
    expect(result.current.selected).toBe(WEEK2);
  });

  it('falls back to the front expiry when the pick rolls off the chain', () => {
    const { result, rerender } = renderHook((expiries: string[]) => useExpiryPicker(expiries), {
      wrapper,
      initialProps: [WEEK1, WEEK2],
    });
    act(() => result.current.select(WEEK1));
    rerender([WEEK2]);
    expect(result.current.selected).toBe(WEEK2);
  });

  it('has nothing selected while the chain is empty', () => {
    const { result } = renderHook(() => useExpiryPicker([]), { wrapper });
    expect(result.current.selected).toBeNull();
  });

  describe('with allowAll', () => {
    it('accepts the empty string as "every expiry"', () => {
      const { result } = renderHook(() => useExpiryPicker([WEEK1], { allowAll: true }), {
        wrapper,
      });
      act(() => result.current.select(''));
      expect(result.current.selected).toBe('');
    });

    it('still defaults to the front expiry', () => {
      const { result } = renderHook(() => useExpiryPicker([WEEK1, WEEK2], { allowAll: true }), {
        wrapper,
      });
      expect(result.current.selected).toBe(WEEK1);
    });

    it('selects all when the chain is empty', () => {
      const { result } = renderHook(() => useExpiryPicker([], { allowAll: true }), { wrapper });
      expect(result.current.selected).toBe('');
    });
  });

  it('rejects the empty string without allowAll', () => {
    const { result } = renderHook(() => useExpiryPicker([WEEK1]), { wrapper });
    act(() => result.current.select(''));
    expect(result.current.selected).toBe(WEEK1);
  });
});
