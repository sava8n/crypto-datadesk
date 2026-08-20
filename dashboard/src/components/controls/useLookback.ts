import { useChartScope } from '../../settings/store';
import type { ArchiveWindow, Resolution } from '../../types';

// short windows read the hourly captures; longer ones the last capture per day,
// keeping the payload bounded (90d at 1h would be ~2200 points per series)
export const resolutionFor = (window: ArchiveWindow): Resolution => (window === '7d' ? '1h' : '1d');

export function useLookback(chartId: string) {
  const { scope } = useChartScope(chartId);
  const window = scope.historyWindow;
  return { window, resolution: resolutionFor(window) };
}
