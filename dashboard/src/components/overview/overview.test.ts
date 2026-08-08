import { describe, it, expect } from 'vitest';

import type { ReportDetail } from '../../types';
import { costLabel, isoWeek, metaLine, timelineLabel, tokenLabel } from './overview';

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

describe('tokenLabel', () => {
  it('abbreviates thousands', () => {
    expect(tokenLabel(8200)).toBe('8.2k TOK');
  });

  it('keeps small counts whole', () => {
    expect(tokenLabel(950)).toBe('950 TOK');
  });

  it('is null without usage data', () => {
    expect(tokenLabel(null)).toBeNull();
  });
});

describe('costLabel', () => {
  it('renders three decimals', () => {
    expect(costLabel(0.041)).toBe('$0.041');
  });

  it('is null without usage data', () => {
    expect(costLabel(null)).toBeNull();
  });
});

const detail = (over: Partial<ReportDetail> = {}): ReportDetail => ({
  id: 1,
  generated_at: '2026-08-09T08:00:00Z',
  model: 'perplexity/sonar-deep-research',
  source: 'openrouter',
  prompt_tokens: 100,
  completion_tokens: 8200,
  cost_usd: 0.041,
  next_report_at: '2026-08-16T08:00:00Z',
  payload: { headline: '', standfirst: '', body_md: '', references: [], calendar: [] },
  ...over,
});

describe('metaLine', () => {
  it('joins model, usage and time', () => {
    const line = metaLine(detail());
    expect(line).toContain('perplexity/sonar-deep-research VIA openrouter');
    expect(line).toContain('8.2k TOK');
    expect(line).toContain('$0.041');
  });

  it('omits usage segments for fixture rows', () => {
    const line = metaLine(detail({ source: 'fixture', completion_tokens: null, cost_usd: null }));
    expect(line).not.toContain('TOK');
    expect(line).not.toContain('$');
  });
});
