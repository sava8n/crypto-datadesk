import { describe, it, expect } from 'vitest';
import { nearestIdx } from './nearest';

describe('nearestIdx', () => {
  const strikes = [90, 100, 110];

  it('finds an exact strike', () => {
    expect(nearestIdx(strikes, 100)).toBe(1);
  });

  it('finds the closest strike for a level in between', () => {
    expect(nearestIdx(strikes, 104)).toBe(1); // closer to 100
    expect(nearestIdx(strikes, 106)).toBe(2); // closer to 110
  });

  it('resolves a tie to the first (lowest-index) strike', () => {
    expect(nearestIdx([90, 110], 100)).toBe(0);
  });

  it('handles a single strike and an empty list', () => {
    expect(nearestIdx([50], 999)).toBe(0);
    expect(nearestIdx([], 5)).toBe(-1);
  });
});
