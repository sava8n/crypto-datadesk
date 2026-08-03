import type { ArchiveWindow, Resolution } from '../../types';
import { useSettings } from '../../settings/store';
import { useSeeded } from './useSeeded';

// short windows read the hourly captures; longer ones the last capture per day,
// keeping the payload bounded (90d at 1h would be ~2200 points per series)
export const resolutionFor = (window: ArchiveWindow): Resolution =>
  window === '7d' ? '1h' : '1d';

/**
 * Section-local archive window, seeded from the settings default.
 *
 * `initial` pins a panel that cannot use the shared default - the VRP panel needs a
 * year of archive before it can pair anything, so it opts out.
 */
export function useLookback(initial?: ArchiveWindow) {
  const { historyWindow } = useSettings();
  const [window, setWindow] = useSeeded<ArchiveWindow>(initial ?? historyWindow);
  return { window, setWindow, resolution: resolutionFor(window) };
}
