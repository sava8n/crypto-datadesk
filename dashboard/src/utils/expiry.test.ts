import { describe, expect, it } from 'vitest';
import { MS_PER_DAY } from './constants';
import { resolveExpiry, resolveFrontExpiry, tenorOf } from './expiry';

// Jan 2026: the 1st is a Thursday, so Fridays fall on the 2nd, 9th, 16th, 23rd, 30th
const WED = '2026-01-07T08:00:00Z';
const THU = '2026-01-08T08:00:00Z';
const FRI_1 = '2026-01-09T08:00:00Z';
const FRI_2 = '2026-01-23T08:00:00Z';
const FRI_LAST = '2026-01-30T08:00:00Z';

describe('resolveFrontExpiry', () => {
  it('picks the first Friday in weekly mode', () => {
    expect(resolveFrontExpiry([WED, FRI_1, FRI_2], 'weekly')).toBe(FRI_1);
  });

  it('picks the last Friday of the month in monthly mode', () => {
    expect(resolveFrontExpiry([FRI_1, FRI_2, FRI_LAST], 'monthly')).toBe(FRI_LAST);
  });

  it('falls back to the first expiry when nothing matches', () => {
    expect(resolveFrontExpiry([WED, THU], 'weekly')).toBe(WED);
    expect(resolveFrontExpiry([FRI_1, FRI_2], 'monthly')).toBe(FRI_1); // no last-Friday present
  });

  it('returns undefined for an empty chain', () => {
    expect(resolveFrontExpiry([], 'weekly')).toBeUndefined();
  });
});

// relative to the wall clock, since tenorOf measures DTE from now
const iso = (daysAhead: number) => new Date(Date.now() + daysAhead * MS_PER_DAY).toISOString();

describe('tenorOf', () => {
  it('passes tenor literals through', () => {
    expect(tenorOf('weekly')).toBe('weekly');
    expect(tenorOf('monthly')).toBe('monthly');
  });

  it('reads all-expiries as monthly', () => {
    expect(tenorOf('all')).toBe('monthly');
  });

  it('reads a concrete pick by its DTE', () => {
    expect(tenorOf(iso(3))).toBe('weekly');
    expect(tenorOf(iso(40))).toBe('monthly');
  });
});

describe('resolveExpiry', () => {
  it('holds a quoted concrete pick', () => {
    expect(resolveExpiry(FRI_1, [WED, FRI_1, FRI_2])).toBe(FRI_1);
  });

  it('falls back to the front expiry of the setting tenor', () => {
    expect(resolveExpiry('weekly', [WED, FRI_1, FRI_2])).toBe(FRI_1);
    expect(resolveExpiry('monthly', [FRI_1, FRI_2, FRI_LAST])).toBe(FRI_LAST);
  });

  it('returns undefined for an empty chain', () => {
    expect(resolveExpiry('weekly', [])).toBeUndefined();
  });
});
