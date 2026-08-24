import { describe, expect, it } from 'vitest';

import { coverageSubtitle } from './coverage';

describe('coverageSubtitle', () => {
  it('labels coverage with the tape start and explained fraction', () => {
    expect(
      coverageSubtitle('USD Δ', {
        tape_start: '2026-07-26T09:00:00Z',
        oi_explained_fraction: 0.78,
      }),
    ).toBe('USD Δ · TAPE FROM 26JUL26 · 78% OI EXPLAINED');
  });

  it('marks an empty tape (and no data yet) explicitly', () => {
    expect(coverageSubtitle('USD / 1% MOVE', undefined)).toBe(
      'USD / 1% MOVE · TAPE-SIGNED · EMPTY TAPE',
    );
    expect(coverageSubtitle('USD Δ', { tape_start: null, oi_explained_fraction: 0 })).toBe(
      'USD Δ · TAPE-SIGNED · EMPTY TAPE',
    );
  });
});
