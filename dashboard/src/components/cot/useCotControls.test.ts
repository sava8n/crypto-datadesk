import { describe, it, expect, beforeEach } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { renderHook, act } from '@testing-library/react';

import { useCotControls } from './useCotControls';
import { SettingsProvider, useSettingsControl } from '../../settings/store';

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(SettingsProvider, null, children);

function useHarness() {
  const [state, setState] = useCotControls();
  return { state, setState, control: useSettingsControl() };
}

beforeEach(() => localStorage.clear());

describe('useCotControls', () => {
  it('seeds from the settings COT defaults', () => {
    const { result } = renderHook(() => useHarness(), { wrapper });
    expect(result.current.state).toEqual({ window: 52, method: 'minmax', flowWeeks: 52 });
  });

  it('keeps a local override while the COT defaults are unchanged', () => {
    const { result } = renderHook(() => useHarness(), { wrapper });
    act(() => result.current.setState({ window: 156, method: 'rank', flowWeeks: 26 }));
    act(() => result.current.control.update({ currency: 'ETH' })); // unrelated change
    expect(result.current.state).toEqual({ window: 156, method: 'rank', flowWeeks: 26 });
  });

  it('re-seeds when the settings defaults move', () => {
    const { result } = renderHook(() => useHarness(), { wrapper });
    act(() => result.current.setState({ window: 156, method: 'rank', flowWeeks: 26 }));
    act(() =>
      result.current.control.update({
        cot: { window: 260, method: 'rank', flowWeeks: 12, netZoom: '1Y', participants: ['dealer'] },
      }),
    );
    expect(result.current.state).toEqual({ window: 260, method: 'rank', flowWeeks: 12 });
  });
});
