import { describe, it, expect } from 'vitest';

import { isoWeek, timelineLabel } from './timeline';

describe('isoWeek', () => {
  it('numbers a mid-year week', () => {
    expect(isoWeek('2026-08-09T08:00:00Z')).toBe(32);
  });

  it('assigns the first days of a year to the prior ISO year week', () => {
    // 2027-01-01 is a Friday; its week's Thursday is 2026-12-31 -> week 53
    expect(isoWeek('2027-01-01T00:00:00Z')).toBe(53);
  });

  it('starts week 1 on the week holding the first Thursday', () => {
    // 2025-12-29 is a Monday; its week's Thursday is 2026-01-01 -> week 1
    expect(isoWeek('2025-12-29T00:00:00Z')).toBe(1);
  });
});

describe('timelineLabel', () => {
  it('names the ISO week', () => {
    expect(timelineLabel('2026-08-09T08:00:00Z')).toBe('WEEKLY · W32 REPORT');
  });
});
