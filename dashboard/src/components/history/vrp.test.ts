import { describe, expect, it } from 'vitest';
import type { VolHistoryPoint } from '../../types';
import { pairForwardRealized } from './vrp';

const DAY = 86_400_000;
const START = Date.parse('2026-06-01T00:00:00Z');

const point = (day: number, iv30: number | null, rv30: number | null): VolHistoryPoint => ({
  as_of: new Date(START + day * DAY).toISOString(),
  spot: 63_000,
  iv7: null,
  iv30,
  term_slope: null,
  rv7: null,
  rv30,
  dvol: null,
  rr25_7: null,
  bf25_7: null,
  rr25_30: null,
  bf25_30: null,
});

describe('pairForwardRealized', () => {
  it('pairs each iv30 with the rv30 exactly one horizon later', () => {
    const points = Array.from({ length: 61 }, (_, d) => point(d, 0.3 + d / 1000, 0.2 + d / 1000));
    const rows = pairForwardRealized(points, 30, 0);
    // days 0..30 have an exact +30d partner; later days run past the series end
    expect(rows).toHaveLength(31);
    expect(rows[0].iv30).toBeCloseTo(0.3);
    expect(rows[0].rv30Fwd).toBeCloseTo(0.2 + 30 / 1000);
    expect(rows[0].vrp).toBeCloseTo(rows[0].iv30 - rows[0].rv30Fwd);
  });

  it('carries the spot observed with the implied leg', () => {
    const points = [point(0, 0.3, 0.2), point(30, 0.3, 0.25)];
    expect(pairForwardRealized(points)[0].spot).toBe(63_000);
  });

  it('skips pairs whose partner is outside the tolerance', () => {
    // nothing lands within 2 days of anyone's +30d mark
    const points = [point(0, 0.3, 0.2), point(24, 0.3, 0.2), point(40, 0.3, 0.2)];
    expect(pairForwardRealized(points)).toHaveLength(0);
  });

  it('skips null observations on either side', () => {
    const points = [
      point(0, null, 0.2), // no iv30
      point(1, 0.3, 0.2), // partner (day 31) has no rv30
      point(31, 0.3, null), // pairs with day 60, one day inside the tolerance
      point(60, 0.3, 0.25), // its own partner is past the series end
    ];
    const rows = pairForwardRealized(points);
    expect(rows).toHaveLength(1);
    expect(rows[0].asOf).toBe(points[2].as_of);
    expect(rows[0].rv30Fwd).toBeCloseTo(0.25);
  });
});
