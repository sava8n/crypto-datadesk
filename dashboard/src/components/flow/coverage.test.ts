import { describe, it, expect } from 'vitest';

import { coverageSuffix } from './coverage';

describe('coverageSuffix', () => {
  it('is empty without data or a tape start', () => {
    expect(coverageSuffix(undefined)).toBe('');
    expect(coverageSuffix({ start: '2026-07-26T00:00:00Z', tape_start: null })).toBe('');
  });

  it('is empty when the tape covers the whole window', () => {
    expect(
      coverageSuffix({ start: '2026-07-26T00:00:00Z', tape_start: '2026-07-20T00:00:00Z' }),
    ).toBe('');
  });

  it('labels the actual data start when the tape is shallower than the window', () => {
    expect(
      coverageSuffix({ start: '2026-07-26T00:00:00Z', tape_start: '2026-07-30T09:00:00Z' }),
    ).toBe(' · DATA FROM 30JUL26');
  });
});
