import { describe, it, expect } from 'vitest';
import { filterByDTE } from './dte';

const pt = (days: number) => ({ tte_years: days / 365.25, label: `${days}d` });

const points = [pt(0), pt(7), pt(30), pt(60)];

describe('filterByDTE', () => {
  it('keeps points whose DTE falls within the inclusive window', () => {
    expect(filterByDTE(points, 0, 30)).toEqual([pt(0), pt(7), pt(30)]);
  });

  it('treats both bounds as inclusive', () => {
    expect(filterByDTE(points, 7, 30)).toEqual([pt(7), pt(30)]);
  });

  it('returns an empty array when nothing matches', () => {
    expect(filterByDTE(points, 100, 200)).toEqual([]);
  });

  it('preserves the original point objects and their extra fields', () => {
    const [kept] = filterByDTE([pt(10)], 5, 15);
    expect(kept).toEqual({ tte_years: 10 / 365.25, label: '10d' });
  });
});
