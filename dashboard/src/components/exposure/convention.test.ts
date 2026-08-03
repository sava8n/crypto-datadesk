import { describe, it, expect } from 'vitest';

import { conventionSubtitle } from './convention';

describe('conventionSubtitle', () => {
  it('states the classic signs under the assumption convention (and before data arrives)', () => {
    expect(conventionSubtitle('USD / 1% MOVE', undefined)).toBe(
      'USD / 1% MOVE · CALLS + / PUTS - × STRIKE',
    );
    expect(
      conventionSubtitle('USD / 1% MOVE', {
        convention: 'assumption',
        tape_start: null,
        oi_explained_fraction: null,
      }),
    ).toBe('USD / 1% MOVE · CALLS + / PUTS - × STRIKE');
  });

  it('labels flow coverage with the tape start and explained fraction', () => {
    expect(
      conventionSubtitle('USD Δ', {
        convention: 'flow',
        tape_start: '2026-07-26T09:00:00Z',
        oi_explained_fraction: 0.78,
      }),
    ).toBe('USD Δ · FLOW-SIGNED · TAPE FROM 26JUL26 · 78% OI EXPLAINED');
  });

  it('marks an empty tape as equivalent to the assumption', () => {
    expect(
      conventionSubtitle('USD Δ', {
        convention: 'flow',
        tape_start: null,
        oi_explained_fraction: 0,
      }),
    ).toBe('USD Δ · FLOW-SIGNED · EMPTY TAPE = ASSUMED');
  });
});
