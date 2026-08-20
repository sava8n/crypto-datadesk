import { useChartScope } from '../../settings/store';
import type { ArchiveWindow, Resolution } from '../../types';

// hourly captures for short windows, last-per-day beyond (90d at 1h would be ~2200 points)
export const resolutionFor = (window: ArchiveWindow): Resolution => (window === '7d' ? '1h' : '1d');

export function useLookback(chartId: string) {
  const { scope } = useChartScope(chartId);
  const window = scope.historyWindow;
  return { window, resolution: resolutionFor(window) };
}
