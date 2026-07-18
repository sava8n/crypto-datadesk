import { describe, it, expect } from 'vitest';
import { COT_CATEGORIES, visibleCotCategories } from './charts';

describe('visibleCotCategories', () => {
  it('keeps the fixed COT_CATEGORIES order regardless of the request order', () => {
    expect(visibleCotCategories(['lev_money', 'dealer']).map((c) => c.key)).toEqual([
      'dealer',
      'lev_money',
    ]);
  });

  it('returns nothing for no keys', () => {
    expect(visibleCotCategories([])).toEqual([]);
  });

  it('returns every category when all keys are requested', () => {
    const all = COT_CATEGORIES.map((c) => c.key);
    expect(visibleCotCategories(all)).toEqual([...COT_CATEGORIES]);
  });
});
