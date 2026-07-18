import { describe, it, expect, beforeEach } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { renderHook, act } from '@testing-library/react';

import { useDteWindow } from './useDteWindow';
import { SettingsProvider, useSettingsControl } from '../../settings/store';

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(SettingsProvider, null, children);

// drive the shared provider and the hook under test together
function useHarness() {
  const [dte, setDte] = useDteWindow();
  return { dte, setDte, control: useSettingsControl() };
}

beforeEach(() => localStorage.clear());

describe('useDteWindow', () => {
  it('seeds from the settings DTE defaults', () => {
    const { result } = renderHook(() => useHarness(), { wrapper });
    expect(result.current.dte).toEqual({ min: 0, max: 30 });
  });

  it('keeps a local override while the DTE default is unchanged', () => {
    const { result } = renderHook(() => useHarness(), { wrapper });
    act(() => result.current.setDte({ min: 3, max: 9 }));
    act(() => result.current.control.update({ currency: 'ETH' })); // unrelated change
    expect(result.current.dte).toEqual({ min: 3, max: 9 });
  });

  it('re-seeds when the settings default moves', () => {
    const { result } = renderHook(() => useHarness(), { wrapper });
    act(() => result.current.setDte({ min: 3, max: 9 }));
    act(() => result.current.control.update({ minDte: 1, maxDte: 45 }));
    expect(result.current.dte).toEqual({ min: 1, max: 45 });
  });
});
