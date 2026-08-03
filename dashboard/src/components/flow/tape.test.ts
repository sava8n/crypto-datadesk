import { describe, it, expect } from 'vitest';

import { instrumentLabel, tags } from './tape';
import type { TapePrint } from '../../types';

const print = (over: Partial<TapePrint> = {}): TapePrint => ({
  trade_id: 'BTC-1',
  ts: '2026-08-02T12:00:00Z',
  instrument_name: 'BTC-7AUG26-64000-C',
  expiry: '2026-08-07T08:00:00Z',
  strike: 64_000,
  option_type: 'C',
  direction: 'buy',
  price: 0.012,
  amount: 25,
  iv: 0.34,
  premium: 18_900,
  block_trade_id: null,
  liquidation: null,
  ...over,
});

describe('instrumentLabel', () => {
  it('renders expiry, strike and leg compactly', () => {
    expect(instrumentLabel(print())).toBe('07AUG26 64k C');
  });
});

describe('tags', () => {
  it('is empty for a plain print', () => {
    expect(tags(print())).toBe('');
  });

  it('flags blocks and liquidations', () => {
    expect(tags(print({ block_trade_id: 'block-1' }))).toBe('BLOCK');
    expect(tags(print({ liquidation: 'T' }))).toBe('LIQ');
    expect(tags(print({ block_trade_id: 'block-1', liquidation: 'MT' }))).toBe('BLOCK LIQ');
  });
});
