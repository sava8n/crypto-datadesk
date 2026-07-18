import { describe, it, expect } from 'vitest';
import { COT_WINDOWS, windowLabel } from './windows';

describe('COT_WINDOWS', () => {
  it('lists the index windows in weeks', () => {
    expect(COT_WINDOWS.map((w) => w.value)).toEqual([52, 156, 260, 0]);
  });
});

describe('windowLabel', () => {
  it('maps a known window to its label', () => {
    expect(windowLabel(52)).toBe('1Y');
    expect(windowLabel(156)).toBe('3Y');
    expect(windowLabel(260)).toBe('5Y');
    expect(windowLabel(0)).toBe('ALL');
  });

  it('renders an unknown window as its week count', () => {
    expect(windowLabel(13)).toBe('13W');
  });
});
