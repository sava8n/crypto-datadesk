export type ThemeMode = 'light' | 'dark';

export const DEFAULT_THEME: ThemeMode = 'light';

export const isThemeMode = (v: unknown): v is ThemeMode => v === 'light' || v === 'dark';
