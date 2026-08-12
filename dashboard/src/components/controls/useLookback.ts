import { useSettings } from '../../settings/store';
import type { ArchiveWindow, Resolution } from '../../types';

// short windows read the hourly captures; longer ones the last capture per day,
// keeping the payload bounded (90d at 1h would be ~2200 points per series)
export const resolutionFor = (window: ArchiveWindow): Resolution => (window === '7d' ? '1h' : '1d');

/**
 * Archive window from settings.
 *
 * `pinned` fixes a panel that cannot use the shared setting - the VRP panel needs a
 * year of archive before it can pair anything, so it opts out.
 */
export function useLookback(pinned?: ArchiveWindow) {
  const { historyWindow } = useSettings();
  const window = pinned ?? historyWindow;
  return { window, resolution: resolutionFor(window) };
}
