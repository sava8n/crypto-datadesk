import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, act } from '@testing-library/react';

import { SettingsProvider, useSettings, useSettingsControl } from './store';
import { DEFAULT_SETTINGS } from '../config';

const KEY = 'datadesk.settings.v1';

const wrapper = ({ children }: { children: ReactNode }) => (
  <SettingsProvider>{children}</SettingsProvider>
);

beforeEach(() => localStorage.clear());

describe('load (via SettingsProvider)', () => {
  it('uses the defaults when nothing is stored', () => {
    const { result } = renderHook(() => useSettings(), { wrapper });
    expect(result.current).toEqual(DEFAULT_SETTINGS);
  });

  it('spreads stored overrides over the defaults and deep-merges nested groups', () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({ currency: 'ETH', minDte: 5, levels: { range: 0.5 } }),
    );
    const { result } = renderHook(() => useSettings(), { wrapper });

    expect(result.current.currency).toBe('ETH');
    expect(result.current.minDte).toBe(5);
    expect(result.current.maxDte).toBe(DEFAULT_SETTINGS.maxDte); // untouched
    expect(result.current.levels).toEqual({ ...DEFAULT_SETTINGS.levels, range: 0.5 }); // deep-merged
  });

  it('falls back to the defaults on an unparseable blob', () => {
    localStorage.setItem(KEY, '{ not json');
    const { result } = renderHook(() => useSettings(), { wrapper });
    expect(result.current).toEqual(DEFAULT_SETTINGS);
  });
});

describe('update / reset', () => {
  it('patches settings and persists them to localStorage', () => {
    const { result } = renderHook(() => useSettingsControl(), { wrapper });

    act(() => result.current.update({ currency: 'ETH' }));

    expect(result.current.settings.currency).toBe('ETH');
    expect(JSON.parse(localStorage.getItem(KEY)!).currency).toBe('ETH');
  });

  it('restores the defaults on reset', () => {
    const { result } = renderHook(() => useSettingsControl(), { wrapper });

    act(() => result.current.update({ minDte: 99 }));
    act(() => result.current.reset());

    expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
  });
});

describe('useSettings guard', () => {
  it('throws when used outside a SettingsProvider', () => {
    // React (dev) re-throws the render error through a synthetic DOM event that jsdom
    // would report as uncaught; swallow both channels so the expected throw is quiet.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const swallow = (e: ErrorEvent) => e.preventDefault();
    window.addEventListener('error', swallow);
    try {
      expect(() => renderHook(() => useSettings())).toThrow(
        'useSettings must be used inside SettingsProvider',
      );
    } finally {
      window.removeEventListener('error', swallow);
      consoleError.mockRestore();
    }
  });
});
