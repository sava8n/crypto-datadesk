import { afterEach, describe, expect, it } from 'vitest';
import { C, THEMES } from './charts';
import { applyTheme, DEFAULT_THEME, isThemeMode } from './mode';

afterEach(() => applyTheme(DEFAULT_THEME));

describe('applyTheme', () => {
  it('moves both halves of the system together', () => {
    applyTheme('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(C.call).toBe(THEMES.dark.call);

    applyTheme('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(C.call).toBe(THEMES.light.call);
  });

  it('leaves no token behind on a switch', () => {
    applyTheme('dark');
    expect({ ...C }).toEqual(THEMES.dark);
  });
});

describe('isThemeMode', () => {
  it('accepts only the two modes', () => {
    expect(isThemeMode('dark')).toBe(true);
    expect(isThemeMode('light')).toBe(true);
    expect(isThemeMode('system')).toBe(false);
    expect(isThemeMode(undefined)).toBe(false);
  });
});
