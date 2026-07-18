import { describe, it, expect } from 'vitest';
import { oiStats } from './stats';
import type { OIByStrikePoint, OIByStrikeResponse } from '../../types';

const oiPoint = (o: Partial<OIByStrikePoint>): OIByStrikePoint => ({
  strike: 0,
  itm_calls: 0,
  otm_calls: 0,
  itm_puts: 0,
  otm_puts: 0,
  intrinsic_value: null,
  ...o,
});

function resp(points: OIByStrikePoint[], over: Partial<OIByStrikeResponse> = {}): OIByStrikeResponse {
  return {
    currency: 'BTC',
    spot: 100,
    as_of: '2026-07-18T00:00:00Z',
    expiries: [],
    expiry: null,
    max_pain: null,
    points,
    ...over,
  };
}

describe('oiStats', () => {
  it('sums call/put OI and derives ratio, notional, and max pain', () => {
    const data = resp(
      [
        oiPoint({ strike: 100, itm_calls: 100, otm_calls: 200, itm_puts: 50, otm_puts: 50 }),
        oiPoint({ strike: 110, otm_calls: 100, itm_puts: 100, otm_puts: 100 }),
      ],
      { max_pain: 105 },
    );

    expect(oiStats(data)).toEqual({
      callOI: 400,
      putOI: 300,
      totalOI: 700,
      pcRatio: 0.75, // 300 / 400
      notional: 70000, // 700 × spot 100
      maxPain: 105,
    });
  });

  it('returns a null ratio when there is no call OI', () => {
    const data = resp([oiPoint({ strike: 100, otm_puts: 200 })]);
    expect(oiStats(data).pcRatio).toBeNull();
  });

  it('handles an empty chain', () => {
    expect(oiStats(resp([]))).toEqual({
      callOI: 0,
      putOI: 0,
      totalOI: 0,
      pcRatio: null,
      notional: 0,
      maxPain: null,
    });
  });
});
