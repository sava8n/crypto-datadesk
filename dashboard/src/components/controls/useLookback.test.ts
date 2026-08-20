import { act, renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';

import { ARCHIVE_WINDOWS, DEFAULT_SCOPE } from '../../config';
import { SettingsProvider, useChartScope } from '../../settings/store';
import { resolutionFor, useLookback } from './useLookback';

describe('resolutionFor', () => {
  it('reads hourly captures for the shortest window only', () => {
    expect(resolutionFor('7d')).toBe('1h');
  });

  it('drops to daily for everything wider', () => {
    expect(resolutionFor('30d')).toBe('1d');
    expect(resolutionFor('90d')).toBe('1d');
    expect(resolutionFor('1y')).toBe('1d');
  });

  it('covers every selectable window', () => {
    for (const window of ARCHIVE_WINDOWS) {
      expect(['1h', '1d']).toContain(resolutionFor(window));
    }
  });
});

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(SettingsProvider, null, children);

beforeEach(() => localStorage.clear());

describe('useLookback', () => {
  it("follows the chart's own scope", () => {
    const { result } = renderHook(
      () => ({
        a: useLookback('volHistory'),
        b: useLookback('oiHistory'),
        control: useChartScope('volHistory'),
      }),
      { wrapper },
    );
    expect(result.current.a).toEqual({ window: DEFAULT_SCOPE.historyWindow, resolution: '1d' });

    act(() => result.current.control.update({ historyWindow: '7d' }));

    expect(result.current.a).toEqual({ window: '7d', resolution: '1h' });
    expect(result.current.b.window).toBe(DEFAULT_SCOPE.historyWindow);
  });
});
