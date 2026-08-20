// Light/dark switching: the stylesheet keys off <html data-theme>; canvas reads chart colours
// as strings, so both move together.

import { setChartTheme } from './charts';

export type ThemeMode = 'light' | 'dark';

export const DEFAULT_THEME: ThemeMode = 'light';

export const isThemeMode = (v: unknown): v is ThemeMode => v === 'light' || v === 'dark';

export function applyTheme(mode: ThemeMode): void {
  setChartTheme(mode);
  if (typeof document !== 'undefined') document.documentElement.dataset.theme = mode;
}
