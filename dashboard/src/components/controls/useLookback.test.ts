import { describe, expect, it } from 'vitest';

import { ARCHIVE_WINDOWS } from '../../config';
import { resolutionFor } from './useLookback';

describe('resolutionFor', () => {
  it('reads hourly captures for the shortest window only', () => {
    expect(resolutionFor('7d')).toBe('1h');
  });

  it('drops to daily for everything wider', () => {
    expect(resolutionFor('30d')).toBe('1d');
    expect(resolutionFor('90d')).toBe('1d');
    expect(resolutionFor('1y')).toBe('1d');
  });

  it('covers every selectable window', () => {
    for (const window of ARCHIVE_WINDOWS) {
      expect(['1h', '1d']).toContain(resolutionFor(window));
    }
  });
});
