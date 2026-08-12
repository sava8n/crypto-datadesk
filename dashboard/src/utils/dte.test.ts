import { describe, expect, it } from 'vitest';
import { DAYS_PER_YEAR } from './constants';
import { filterByDte } from './dte';

const pt = (days: number) => ({ tte_years: days / DAYS_PER_YEAR, label: `${days}d` });

const points = [pt(0), pt(7), pt(30), pt(60)];

describe('filterByDte', () => {
  it('keeps points whose DTE falls within the inclusive window', () => {
    expect(filterByDte(points, 0, 30)).toEqual([pt(0), pt(7), pt(30)]);
  });

  it('treats both bounds as inclusive', () => {
    expect(filterByDte(points, 7, 30)).toEqual([pt(7), pt(30)]);
  });

  it('returns an empty array when nothing matches', () => {
    expect(filterByDte(points, 100, 200)).toEqual([]);
  });

  it('preserves the original point objects and their extra fields', () => {
    const [kept] = filterByDte([pt(10)], 5, 15);
    expect(kept).toEqual({ tte_years: 10 / DAYS_PER_YEAR, label: '10d' });
  });
});
