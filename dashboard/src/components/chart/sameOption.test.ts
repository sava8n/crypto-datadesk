import { describe, it, expect } from 'vitest';

import { sameOption } from './sameOption';

describe('sameOption', () => {
  it('holds for the same reference', () => {
    const option = { series: [{ data: [1, 2] }] };
    expect(sameOption(option, option)).toBe(true);
  });

  it('holds for equal values built separately', () => {
    expect(sameOption({ series: [{ data: [1, 2] }] }, { series: [{ data: [1, 2] }] })).toBe(true);
  });

  // formatters are rebuilt on every build; the values they render are in the option beside them
  it('treats two functions as equal', () => {
    expect(sameOption({ formatter: () => 'a' }, { formatter: () => 'b' })).toBe(true);
  });

  // the surface mesh uses NaN for cells the chain could not fill
  it('treats NaN as equal to NaN', () => {
    expect(sameOption([1, NaN], [1, NaN])).toBe(true);
    expect(sameOption([1, NaN], [1, 2])).toBe(false);
  });

  it('fails on a differing value deep in a series', () => {
    expect(sameOption({ series: [{ data: [1, 2] }] }, { series: [{ data: [1, 3] }] })).toBe(false);
  });

  it('fails on a differing array length', () => {
    expect(sameOption({ series: [1] }, { series: [1, 2] })).toBe(false);
  });

  it('fails on an extra key', () => {
    expect(sameOption({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  it('fails on a renamed key', () => {
    expect(sameOption({ a: 1 }, { b: 1 })).toBe(false);
  });

  it('distinguishes an array from an object', () => {
    expect(sameOption([], {})).toBe(false);
  });

  it('distinguishes null from an object', () => {
    expect(sameOption(null, {})).toBe(false);
    expect(sameOption(null, null)).toBe(true);
  });
});
