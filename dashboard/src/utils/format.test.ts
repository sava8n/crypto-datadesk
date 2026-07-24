import { describe, it, expect } from 'vitest';
import {
  expiryLabel,
  strikeFmt,
  oiFmt,
  oiFull,
  usdShort,
  usdFull,
  priceWhole,
  ivFmt,
  dvolFmt,
} from './format';

describe('expiryLabel', () => {
  it('formats an ISO expiry as DDMONYY in UTC', () => {
    expect(expiryLabel('2026-07-04T08:00:00Z')).toBe('04JUL26');
    expect(expiryLabel('2026-01-09T08:00:00Z')).toBe('09JAN26');
  });

  it('uses the UTC day regardless of the local timezone', () => {
    // 23:00Z is still the 4th in UTC even where local time has rolled to the 5th
    expect(expiryLabel('2026-07-04T23:00:00Z')).toBe('04JUL26');
  });
});

describe('strikeFmt', () => {
  it('divides by 1000 and appends k', () => {
    expect(strikeFmt(62000)).toBe('62k');
    expect(strikeFmt(62500)).toBe('62.5k');
    expect(strikeFmt(1_000_000)).toBe('1,000k');
  });
});

describe('oiFmt', () => {
  it('rounds values below 1000 and abbreviates the rest', () => {
    expect(oiFmt(500)).toBe('500');
    expect(oiFmt(999)).toBe('999');
    expect(oiFmt(1000)).toBe('1k');
    expect(oiFmt(1500)).toBe('1.5k');
    expect(oiFmt(1234)).toBe('1.2k');
  });
});

describe('oiFull', () => {
  it('groups thousands with no fraction', () => {
    expect(oiFull(1_234_567)).toBe('1,234,567');
    expect(oiFull(999)).toBe('999');
  });
});

describe('usdShort', () => {
  it('picks the B/M/k/plain band by magnitude', () => {
    expect(usdShort(1_500_000_000)).toBe('$1.5B');
    expect(usdShort(12_500_000)).toBe('$12.5M');
    expect(usdShort(2500)).toBe('$2.5k');
    expect(usdShort(500)).toBe('$500');
  });

  it('bands on the boundary values', () => {
    expect(usdShort(1e9)).toBe('$1B');
    expect(usdShort(1e6)).toBe('$1M');
    expect(usdShort(1000)).toBe('$1k');
    expect(usdShort(999)).toBe('$999');
  });

  it('keeps the sign for negatives', () => {
    expect(usdShort(-12_500_000)).toBe('$-12.5M');
    expect(usdShort(-500)).toBe('$-500');
  });
});

describe('usdFull', () => {
  it('always shows two decimals', () => {
    expect(usdFull(61500)).toBe('$61,500.00');
    expect(usdFull(61500.4)).toBe('$61,500.40');
    expect(usdFull(-100)).toBe('$-100.00');
  });
});

describe('priceWhole', () => {
  it('rounds to whole units with grouping', () => {
    expect(priceWhole(61500.4)).toBe('61,500');
    expect(priceWhole(61500.6)).toBe('61,501');
  });
});

describe('ivFmt', () => {
  it('renders a fraction as a whole percent', () => {
    expect(ivFmt(0.42)).toBe('42%');
    expect(ivFmt(1)).toBe('100%');
  });
});

describe('dvolFmt', () => {
  it('renders a fraction as a one-decimal index level', () => {
    expect(dvolFmt(0.382)).toBe('38.2');
    expect(dvolFmt(0.4)).toBe('40.0');
  });
});
