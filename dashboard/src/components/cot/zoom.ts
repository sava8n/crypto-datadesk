export type CotZoom = '3M' | '6M' | '1Y' | 'YTD' | 'ALL';

export const COT_ZOOMS: { value: CotZoom; label: string }[] = [
  { value: '3M', label: '3M' },
  { value: '6M', label: '6M' },
  { value: '1Y', label: '1Y' },
  { value: 'YTD', label: 'YTD' },
  { value: 'ALL', label: 'ALL' },
];

const MONTHS: Partial<Record<CotZoom, number>> = { '3M': 3, '6M': 6, '1Y': 12 };

// first point index for the preset's window (0 = full history); dates are the
// sorted report_date strings and compare lexicographically as ISO YYYY-MM-DD
export function zoomStartIndex(dates: string[], zoom: CotZoom): number {
  if (zoom === 'ALL' || dates.length === 0) return 0;
  const last = dates[dates.length - 1];
  let cutoff: string;
  if (zoom === 'YTD') {
    cutoff = `${last.slice(0, 4)}-01-01`; // Jan 1 of the latest report's year
  } else {
    const d = new Date(`${last}T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() - (MONTHS[zoom] ?? 6));
    cutoff = d.toISOString().slice(0, 10);
  }
  const idx = dates.findIndex((dt) => dt >= cutoff);
  return idx < 0 ? 0 : idx;
}
