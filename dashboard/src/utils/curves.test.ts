import { describe, it, expect } from 'vitest';
import { averageByStrike, groupByExpiry } from './curves';

const pt = (expiry: string, tte_years: number, strike: number, value: number) => ({
  expiry,
  tte_years,
  strike,
  value,
});

describe('averageByStrike', () => {
  it('averages a call and a put quoted at the same strike', () => {
    const points = [
      { strike: 100, value: 0.6 },
      { strike: 100, value: 0.4 },
    ];
    expect(averageByStrike(points, (p) => p.value)).toEqual([[100, 0.5]]);
  });

  it('sorts ascending by strike', () => {
    const points = [
      { strike: 120, value: 1 },
      { strike: 90, value: 2 },
      { strike: 100, value: 3 },
    ];
    expect(averageByStrike(points, (p) => p.value)).toEqual([
      [90, 2],
      [100, 3],
      [120, 1],
    ]);
  });

  it('returns an empty list for no points', () => {
    expect(averageByStrike([], (p: { strike: number }) => p.strike)).toEqual([]);
  });
});

describe('groupByExpiry', () => {
  it('builds one curve per expiry, near-dated first', () => {
    const points = [
      pt('FAR', 0.5, 100, 1),
      pt('NEAR', 0.1, 100, 2),
      pt('NEAR', 0.1, 110, 3),
    ];
    expect(groupByExpiry(points, (p) => p.value)).toEqual([
      { expiry: 'NEAR', tte: 0.1, points: [[100, 2], [110, 3]] },
      { expiry: 'FAR', tte: 0.5, points: [[100, 1]] },
    ]);
  });

  it('averages duplicate strikes within an expiry', () => {
    const points = [pt('E', 0.1, 100, 0.6), pt('E', 0.1, 100, 0.4)];
    expect(groupByExpiry(points, (p) => p.value)[0].points).toEqual([[100, 0.5]]);
  });

  it('works for any picked measure', () => {
    const points = [pt('E', 0.1, 100, 7)];
    expect(groupByExpiry(points, (p) => p.strike)[0].points).toEqual([[100, 100]]);
  });

  it('returns an empty list for no points', () => {
    expect(groupByExpiry([], (p: { strike: number }) => p.strike)).toEqual([]);
  });
});
