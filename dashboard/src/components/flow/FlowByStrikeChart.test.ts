import { describe, it, expect } from 'vitest';

import { buildFlowByStrikeOption } from './FlowByStrikeChart';
import type { FlowByStrikeResponse } from '../../types';

const resp = (points: FlowByStrikeResponse['points']): FlowByStrikeResponse => ({
  currency: 'BTC',
  window: '24h',
  start: '2026-08-01T12:00:00Z',
  end: '2026-08-02T12:00:00Z',
  tape_start: null,
  points,
});

describe('buildFlowByStrikeOption', () => {
  it('plots signed call/put flow over strikes, low first', () => {
    const option = buildFlowByStrikeOption(
      resp([
        {
          strike: 110_000,
          call_contracts: -3,
          put_contracts: 1,
          call_premium: -9_000,
          put_premium: 500,
        },
        {
          strike: 90_000,
          call_contracts: 5,
          put_contracts: -2,
          call_premium: 12_000,
          put_premium: -700,
        },
      ]),
    );
    const series = option.series as { type: string; data: number[] }[];
    expect(series).toHaveLength(2);
    expect(series[0].data).toEqual([5, -3]);
    expect(series[1].data).toEqual([-2, 1]);
    expect((option.xAxis as { data: string[] }).data).toEqual(['90k', '110k']);
  });

  it('anchors a zero line for the signed flow', () => {
    const option = buildFlowByStrikeOption(
      resp([
        {
          strike: 100_000,
          call_contracts: 1,
          put_contracts: 0,
          call_premium: 100,
          put_premium: 0,
        },
      ]),
    );
    const first = (option.series as { markLine?: { data: { yAxis: number }[] } }[])[0];
    expect(first.markLine?.data[0].yAxis).toBe(0);
  });
});
