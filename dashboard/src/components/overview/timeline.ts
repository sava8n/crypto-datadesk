// Pure helpers for the timeline's labels.

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
