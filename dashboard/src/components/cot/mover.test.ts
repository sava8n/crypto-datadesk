import { describe, it, expect } from 'vitest';
import { biggestMover } from './mover';
import type { CotReportRow } from '../../types';

function row(category: string, delta_net: number | null): CotReportRow {
  return {
    category,
    label: category,
    long: 0,
    short: 0,
    spread: null,
    net: 0,
    delta_net,
    delta_net_pct: null,
    net_pct_of_oi: null,
    index: null,
    traders_long: null,
    traders_short: null,
  };
}

describe('biggestMover', () => {
  it('returns the row with the largest absolute net change', () => {
    const rows = [row('a', 100), row('b', -250), row('c', 50)];
    expect(biggestMover(rows)?.category).toBe('b');
  });

  it('skips rows with a null delta', () => {
    const rows = [row('a', null), row('b', 30), row('c', null)];
    expect(biggestMover(rows)?.category).toBe('b');
  });

  it('returns null when every delta is null', () => {
    expect(biggestMover([row('a', null), row('b', null)])).toBeNull();
  });

  it('returns null for no rows', () => {
    expect(biggestMover([])).toBeNull();
  });
});
