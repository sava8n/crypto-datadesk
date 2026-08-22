import { describe, expect, it } from 'vitest';
import { filterByMoneyness, levelIdx } from './strikes';

const pt = (strike: number) => ({ strike, label: `${strike}` });

const points = [pt(50), pt(75), pt(90), pt(100), pt(110), pt(125), pt(150)];

describe('filterByMoneyness', () => {
  it('keeps strikes within the inclusive band around spot', () => {
    expect(filterByMoneyness(points, 100, '10')).toEqual([pt(90), pt(100), pt(110)]);
    expect(filterByMoneyness(points, 100, '25')).toEqual([
      pt(75),
      pt(90),
      pt(100),
      pt(110),
      pt(125),
    ]);
  });

  it('keeps every strike for ALL', () => {
    expect(filterByMoneyness(points, 100, 'all')).toBe(points);
  });

  it('keeps every strike while spot is unknown', () => {
    expect(filterByMoneyness(points, null, '10')).toBe(points);
    expect(filterByMoneyness(points, 0, '10')).toBe(points);
  });

  it('preserves the original point objects', () => {
    const [kept] = filterByMoneyness([pt(100)], 100, '10');
    expect(kept).toEqual({ strike: 100, label: '100' });
  });
});

describe('levelIdx', () => {
  const strikes = [90, 100, 110];

  it('finds the nearest quoted strike', () => {
    expect(levelIdx(strikes, 104)).toBe(1);
    expect(levelIdx(strikes, 110)).toBe(2);
  });

  it('reports no index for a level outside the shown range', () => {
    expect(levelIdx(strikes, 89)).toBe(-1);
    expect(levelIdx(strikes, 111)).toBe(-1);
  });

  it('reports no index without a level or without strikes', () => {
    expect(levelIdx(strikes, null)).toBe(-1);
    expect(levelIdx([], 100)).toBe(-1);
  });
});
