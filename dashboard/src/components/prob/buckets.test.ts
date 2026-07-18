import { describe, it, expect } from 'vitest';
import { buildBuckets } from './buckets';
import type { ProbCurvePoint } from '../../types';

const pp = (strike: number, prob_above: number, option_type = 'C'): ProbCurvePoint => ({
  expiry: '2026-07-31T08:00:00Z',
  tte_years: 0.1,
  strike,
  prob_above,
  option_type,
});

describe('buildBuckets', () => {
  it('turns a survival curve into interior masses plus closing tails', () => {
    // P(S>K): 90k -> .8, 100k -> .6, 110k -> .2
    const { buckets, spotBucket } = buildBuckets(
      [pp(90000, 0.8), pp(100000, 0.6), pp(110000, 0.2)],
      105000,
    );

    expect(buckets.map((b) => b.label)).toEqual(['<90k', '90k–100k', '100k–110k', '>110k']);
    expect(buckets.map((b) => b.tail)).toEqual([true, false, false, true]);

    const probs = buckets.map((b) => b.prob);
    expect(probs[0]).toBeCloseTo(0.2); // low tail: 1 - .8
    expect(probs[1]).toBeCloseTo(0.2); // .8 - .6
    expect(probs[2]).toBeCloseTo(0.4); // .6 - .2
    expect(probs[3]).toBeCloseTo(0.2); // high tail: .2
    expect(probs.reduce((s, v) => s + v, 0)).toBeCloseTo(1);

    // spot 105k falls in the 100k–110k interior bucket (category 2, after the low tail)
    expect(spotBucket).toBe(2);
  });

  it('averages a call and a put quoted at the same strike', () => {
    const { buckets } = buildBuckets(
      [pp(90000, 0.8), pp(100000, 0.4, 'C'), pp(100000, 0.6, 'P'), pp(110000, 0.2)],
      95000,
    );
    // 100k prob averages to .5 -> 90k–100k = .8-.5, 100k–110k = .5-.2
    expect(buckets[1].prob).toBeCloseTo(0.3);
    expect(buckets[2].prob).toBeCloseTo(0.3);
  });

  it('clamps negative mass from a non-monotone curve to zero', () => {
    const { buckets } = buildBuckets([pp(90000, 0.3), pp(100000, 0.5)], 95000);
    expect(buckets[1].prob).toBe(0);
  });

  it('reports spotBucket -1 when spot is outside the quoted range', () => {
    const points = [pp(90000, 0.8), pp(100000, 0.6), pp(110000, 0.2)];
    expect(buildBuckets(points, 80000).spotBucket).toBe(-1);
    expect(buildBuckets(points, 120000).spotBucket).toBe(-1);
  });

  it('returns empty output for no points', () => {
    expect(buildBuckets([], 100000)).toEqual({ buckets: [], spotBucket: -1 });
  });
});
