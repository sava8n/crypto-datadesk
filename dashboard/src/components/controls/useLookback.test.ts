import { describe, it, expect } from 'vitest';

import { LOOKBACKS } from '../../config';
import { resolutionFor } from './useLookback';

describe('resolutionFor', () => {
  it('reads hourly captures for short lookbacks', () => {
    expect(resolutionFor(7)).toBe('1h');
    expect(resolutionFor(14)).toBe('1h');
  });

  it('drops to daily beyond two weeks', () => {
    expect(resolutionFor(15)).toBe('1d');
    expect(resolutionFor(90)).toBe('1d');
    expect(resolutionFor(365)).toBe('1d');
  });

  it('covers every preset', () => {
    for (const days of LOOKBACKS) {
      expect(['1h', '1d']).toContain(resolutionFor(days));
    }
  });
});
