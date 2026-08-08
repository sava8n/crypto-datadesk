// Pure helpers for the overview tab's labels.

import type { ReportDetail } from '../../types';
import { timeLabel } from '../../utils/format';

// ISO-8601 week number via the Thursday rule: a week belongs to the year holding its
// Thursday, which is what naive day-count implementations get wrong at year boundaries
export function isoWeek(iso: string): number {
  const d = new Date(iso);
  const thursday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  thursday.setUTCDate(thursday.getUTCDate() + 4 - (thursday.getUTCDay() || 7));
  const yearStart = Date.UTC(thursday.getUTCFullYear(), 0, 1);
  return Math.ceil(((thursday.getTime() - yearStart) / 86_400_000 + 1) / 7);
}

export function timelineLabel(iso: string): string {
  return `WEEKLY · W${isoWeek(iso)} REPORT`;
}

// 8200 -> "8.2k TOK"
export function tokenLabel(completionTokens: number | null): string | null {
  if (completionTokens == null) return null;
  if (completionTokens < 1000) return `${completionTokens} TOK`;
  return `${(completionTokens / 1000).toFixed(1)}k TOK`;
}

// 0.041 -> "$0.041"
export function costLabel(costUsd: number | null): string | null {
  if (costUsd == null) return null;
  return `$${costUsd.toFixed(3)}`;
}

export function metaLine(detail: ReportDetail): string {
  const parts = [
    `${detail.model} VIA ${detail.source}`,
    tokenLabel(detail.completion_tokens),
    costLabel(detail.cost_usd),
    `${timeLabel(detail.generated_at)}Z`,
  ];
  return parts.filter((p): p is string => p != null).join(' · ');
}
