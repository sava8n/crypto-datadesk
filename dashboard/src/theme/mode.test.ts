import { describe, expect, it } from 'vitest';
import { isThemeMode } from './mode';

describe('isThemeMode', () => {
  it('accepts only the two modes', () => {
    expect(isThemeMode('dark')).toBe(true);
    expect(isThemeMode('light')).toBe(true);
    expect(isThemeMode('system')).toBe(false);
    expect(isThemeMode(undefined)).toBe(false);
  });
});
