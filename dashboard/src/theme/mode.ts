// Light/dark switching. Two consumers have to move together: the stylesheet, which keys its
// token block off <html data-theme>, and the chart token bag, which canvas reads as strings.

import { setChartTheme } from './charts';

export type ThemeMode = 'light' | 'dark';

export const DEFAULT_THEME: ThemeMode = 'light';

export const isThemeMode = (v: unknown): v is ThemeMode => v === 'light' || v === 'dark';

/** Point both halves of the colour system at one mode. Safe to call repeatedly. */
export function applyTheme(mode: ThemeMode): void {
  setChartTheme(mode);
  if (typeof document !== 'undefined') document.documentElement.dataset.theme = mode;
}
