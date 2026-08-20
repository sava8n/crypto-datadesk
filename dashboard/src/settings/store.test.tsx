import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SCOPE, DEFAULT_SETTINGS, MIN_REFRESH_SECONDS } from '../config';
import { colors, THEMES } from '../theme/charts';
import { applyTheme, DEFAULT_THEME } from '../theme/mode';
import {
  SettingsProvider,
  useChartScope,
  useRefreshMs,
  useSettings,
  useSettingsControl,
} from './store';

const KEY = 'datadesk.settings.v3';
const SCOPES_KEY = 'datadesk.scopes.v1';

const wrapper = ({ children }: { children: ReactNode }) => (
  <SettingsProvider>{children}</SettingsProvider>
);

beforeEach(() => localStorage.clear());
afterEach(() => applyTheme(DEFAULT_THEME));

describe('load (via SettingsProvider)', () => {
  it('uses the defaults when nothing is stored', () => {
    const { result } = renderHook(() => useSettings(), { wrapper });
    expect(result.current).toEqual(DEFAULT_SETTINGS);
  });

  it('spreads stored overrides over the defaults', () => {
    localStorage.setItem(KEY, JSON.stringify({ currency: 'ETH' }));
    const { result } = renderHook(() => useSettings(), { wrapper });

    expect(result.current.currency).toBe('ETH');
    expect(result.current.refreshSeconds).toBe(DEFAULT_SETTINGS.refreshSeconds);
  });

  it('ignores an older blob rather than carrying its dropped fields forward', () => {
    localStorage.setItem('datadesk.settings.v2', JSON.stringify({ currency: 'ETH' }));
    const { result } = renderHook(() => useSettings(), { wrapper });
    expect(result.current).toEqual(DEFAULT_SETTINGS);
  });

  it('falls back to the defaults on an unparseable blob', () => {
    localStorage.setItem(KEY, '{ not json');
    const { result } = renderHook(() => useSettings(), { wrapper });
    expect(result.current).toEqual(DEFAULT_SETTINGS);
  });

  it('picks up the default for a field the stored blob predates', () => {
    localStorage.setItem(KEY, JSON.stringify({ currency: 'BTC' }));
    const { result } = renderHook(() => useSettings(), { wrapper });
    expect(result.current.stripTenor).toBe(DEFAULT_SETTINGS.stripTenor);
  });
});

describe('theme', () => {
  it('applies the stored mode to the document and the chart tokens', () => {
    localStorage.setItem(KEY, JSON.stringify({ theme: 'dark' }));
    renderHook(() => useSettings(), { wrapper });

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(colors.call).toBe(THEMES.dark.call);
  });

  it('switches both halves before the charts below re-render', () => {
    const { result } = renderHook(() => useSettingsControl(), { wrapper });

    act(() => result.current.update({ theme: 'dark' }));

    expect(result.current.settings.theme).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(colors.call).toBe(THEMES.dark.call);
    expect(JSON.parse(localStorage.getItem(KEY) ?? '{}').theme).toBe('dark');
  });

  it('lands a blob that predates the field on light', () => {
    localStorage.setItem(KEY, JSON.stringify({ currency: 'BTC' }));
    const { result } = renderHook(() => useSettings(), { wrapper });
    expect(result.current.theme).toBe('light');
  });

  it('rejects a stored mode it cannot render', () => {
    localStorage.setItem(KEY, JSON.stringify({ theme: 'solarized', refreshSeconds: 45 }));
    const { result } = renderHook(() => useSettings(), { wrapper });

    expect(result.current.theme).toBe('light');
    expect(result.current.refreshSeconds).toBe(45);
  });
});

describe('useRefreshMs', () => {
  it('reports the configured period in milliseconds', () => {
    localStorage.setItem(KEY, JSON.stringify({ refreshSeconds: 45 }));
    const { result } = renderHook(() => useRefreshMs(), { wrapper });
    expect(result.current).toBe(45_000);
  });

  it('clamps a stored period below the service cache floor', () => {
    localStorage.setItem(KEY, JSON.stringify({ refreshSeconds: 0 }));
    const { result } = renderHook(() => useRefreshMs(), { wrapper });
    expect(result.current).toBe(MIN_REFRESH_SECONDS * 1000);
  });
});

describe('useChartScope', () => {
  it('fills every field from the defaults when a chart has no stored scope', () => {
    const { result } = renderHook(() => useChartScope('gexByStrike'), { wrapper });
    expect(result.current.scope).toEqual(DEFAULT_SCOPE);
  });

  it('keeps each chart on its own scope', () => {
    const { result } = renderHook(
      () => ({ a: useChartScope('flowByStrike'), b: useChartScope('flowByExpiry') }),
      { wrapper },
    );

    act(() => result.current.a.update({ flowWindow: '24h' }));

    expect(result.current.a.scope.flowWindow).toBe('24h');
    expect(result.current.b.scope.flowWindow).toBe(DEFAULT_SCOPE.flowWindow);
  });

  it('persists a chart scope under its own key', () => {
    const { result } = renderHook(() => useChartScope('termStructure'), { wrapper });

    act(() => result.current.update({ minDte: 7, maxDte: 90 }));

    expect(result.current.scope.minDte).toBe(7);
    const stored = JSON.parse(localStorage.getItem(SCOPES_KEY) ?? '{}');
    expect(stored.termStructure).toEqual({ minDte: 7, maxDte: 90 });
  });

  it('reads a stored scope back on mount', () => {
    localStorage.setItem(SCOPES_KEY, JSON.stringify({ tape: { tapeMinPremium: 100_000 } }));
    const { result } = renderHook(() => useChartScope('tape'), { wrapper });
    expect(result.current.scope.tapeMinPremium).toBe(100_000);
  });

  it('falls back to an empty map on an unparseable scopes blob', () => {
    localStorage.setItem(SCOPES_KEY, '{ not json');
    const { result } = renderHook(() => useChartScope('tape'), { wrapper });
    expect(result.current.scope).toEqual(DEFAULT_SCOPE);
  });
});

describe('update', () => {
  it('patches settings and persists them to localStorage', () => {
    const { result } = renderHook(() => useSettingsControl(), { wrapper });

    act(() => result.current.update({ refreshSeconds: 90 }));

    expect(result.current.settings.refreshSeconds).toBe(90);
    expect(JSON.parse(localStorage.getItem(KEY) ?? '{}').refreshSeconds).toBe(90);
  });
});

describe('useSettings guard', () => {
  it('throws when used outside a SettingsProvider', () => {
    // React (dev) re-throws render errors through a DOM event jsdom reports as uncaught
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
