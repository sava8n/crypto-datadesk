import { describe, it, expect } from 'vitest';
import { COT_METHODS, methodLabel } from './methods';

describe('COT_METHODS', () => {
  it('lists the two index methods', () => {
    expect(COT_METHODS.map((m) => m.value)).toEqual(['minmax', 'rank']);
  });
});

describe('methodLabel', () => {
  it('maps a known method to its label', () => {
    expect(methodLabel('minmax')).toBe('MIN-MAX');
    expect(methodLabel('rank')).toBe('RANK');
  });

  it('upper-cases an unknown method as a fallback', () => {
    expect(methodLabel('custom')).toBe('CUSTOM');
  });
});
