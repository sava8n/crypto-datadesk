import { describe, it, expect } from 'vitest';
import { frontExpiry } from './expiry';

// Jan 2026: the 1st is a Thursday, so Fridays fall on the 2nd, 9th, 16th, 23rd, 30th
const WED = '2026-01-07T08:00:00Z';
const THU = '2026-01-08T08:00:00Z';
const FRI_1 = '2026-01-09T08:00:00Z';
const FRI_2 = '2026-01-23T08:00:00Z';
const FRI_LAST = '2026-01-30T08:00:00Z'; // last Friday of January

describe('frontExpiry', () => {
  it('picks the first Friday in weekly mode', () => {
    expect(frontExpiry([WED, FRI_1, FRI_2], 'weekly')).toBe(FRI_1);
  });

  it('picks the last Friday of the month in monthly mode', () => {
    expect(frontExpiry([FRI_1, FRI_2, FRI_LAST], 'monthly')).toBe(FRI_LAST);
  });

  it('falls back to the first expiry when nothing matches', () => {
    expect(frontExpiry([WED, THU], 'weekly')).toBe(WED);
    expect(frontExpiry([FRI_1, FRI_2], 'monthly')).toBe(FRI_1); // no last-Friday present
  });

  it('returns undefined for an empty chain', () => {
    expect(frontExpiry([], 'weekly')).toBeUndefined();
  });
});
