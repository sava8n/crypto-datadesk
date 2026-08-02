import { describe, it, expect } from 'vitest';

import { buildExpiryRows } from './expiryTable';
import type { MaxPainResponse, ProbQuantilePoint } from '../../types';

const maxPain = (points: MaxPainResponse['points']): MaxPainResponse => ({
  currency: 'BTC',
  spot: 100_000,
  as_of: '2026-08-01T00:00:00Z',
  points,
});

const quantile = (expiry: string, p16: number | null, p84: number | null): ProbQuantilePoint => ({
  expiry,
  tte_years: 0.05,
  p16,
  p50: 100_000,
  p84,
});

describe('buildExpiryRows', () => {
  it('joins max pain with the implied move per expiry', () => {
    const rows = buildExpiryRows(
      maxPain([{ expiry: 'e1', tte_years: 7 / 365.25, max_pain: 98_000 }]),
      [quantile('e1', 95_000, 105_000)],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].dte).toBeCloseTo(7);
    expect(rows[0].maxPainPct).toBeCloseTo(-0.02);
    expect(rows[0].em).toBeCloseTo(5_000); // (p84 - p16) / 2
    expect(rows[0].emPct).toBeCloseTo(0.05);
  });

  it('leaves gaps null instead of dropping the expiry', () => {
    const rows = buildExpiryRows(
      maxPain([
        { expiry: 'e1', tte_years: 0.02, max_pain: null },
        { expiry: 'e2', tte_years: 0.04, max_pain: 98_000 },
      ]),
      [quantile('e2', null, 105_000)],
    );
    expect(rows).toHaveLength(2);
    expect(rows[0].maxPain).toBeNull();
    expect(rows[0].em).toBeNull(); // no quantile row at all for e1
    expect(rows[1].em).toBeNull(); // e2's curve did not span p16
    expect(rows[1].maxPainPct).toBeCloseTo(-0.02);
  });
});
