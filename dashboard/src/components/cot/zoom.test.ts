import { describe, it, expect } from 'vitest';
import { zoomStartIndex } from './zoom';

// sorted report dates spanning ~18 months; last report is 2026-07-14
const dates = [
  '2025-01-07', // 0
  '2025-04-01', // 1
  '2025-07-01', // 2
  '2025-10-01', // 3
  '2026-01-06', // 4
  '2026-04-07', // 5
  '2026-07-14', // 6
];

describe('zoomStartIndex', () => {
  it('returns 0 for the ALL preset', () => {
    expect(zoomStartIndex(dates, 'ALL')).toBe(0);
  });

  it('returns 0 for an empty history', () => {
    expect(zoomStartIndex([], '1Y')).toBe(0);
  });

  it('starts YTD at the first report of the latest year', () => {
    expect(zoomStartIndex(dates, 'YTD')).toBe(4); // 2026-01-06
  });

  it('subtracts the month span for 3M/6M/1Y presets', () => {
    expect(zoomStartIndex(dates, '3M')).toBe(6); // >= 2026-04-14
    expect(zoomStartIndex(dates, '6M')).toBe(5); // >= 2026-01-14
    expect(zoomStartIndex(dates, '1Y')).toBe(3); // >= 2025-07-14
  });
});
