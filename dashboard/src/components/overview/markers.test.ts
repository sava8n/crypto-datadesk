import { describe, it, expect } from 'vitest';

import { dropUnknownMarkers, groupMarkers, splitMarkers } from './markers';

describe('splitMarkers', () => {
  it('splits text around markers, keeping ids as numbers', () => {
    expect(splitMarkers('vol widened.[1][3] Meanwhile')).toEqual(['vol widened.', 1, 3, ' Meanwhile']);
  });

  it('handles markers at the start and end', () => {
    expect(splitMarkers('[2] leads and trails [7]')).toEqual([2, ' leads and trails ', 7]);
  });

  it('passes non-marker brackets through unchanged', () => {
    expect(splitMarkers('an [inline note] stays')).toEqual(['an [inline note] stays']);
    expect(splitMarkers('[n]')).toEqual(['[n]']);
  });

  it('returns plain text as a single chunk', () => {
    expect(splitMarkers('no markers here')).toEqual(['no markers here']);
  });

  it('tolerates dangling ids beyond the reference list', () => {
    expect(splitMarkers('claim[20]')).toEqual(['claim', 20]);
  });

  it('returns an empty list for empty text', () => {
    expect(splitMarkers('')).toEqual([]);
  });
});

describe('dropUnknownMarkers', () => {
  const known = new Set([1, 3]);

  it('keeps markers with a matching reference', () => {
    expect(dropUnknownMarkers(['claim', 1, ' and', 3], known)).toEqual(['claim', 1, ' and', 3]);
  });

  it('drops markers without one, eating the space that led in', () => {
    expect(dropUnknownMarkers(['claim ', 20, '.'], known)).toEqual(['claim', '.']);
  });

  it('drops a dangling marker glued to its claim', () => {
    expect(dropUnknownMarkers(['claim', 20, ' more'], known)).toEqual(['claim', ' more']);
  });

  it('handles consecutive markers of mixed validity', () => {
    expect(dropUnknownMarkers(['vol.', 1, 9, ' next'], known)).toEqual(['vol.', 1, ' next']);
  });

  it('removes a whitespace-only chunk left behind', () => {
    expect(dropUnknownMarkers([' ', 20], known)).toEqual([]);
  });

  it('passes plain text through', () => {
    expect(dropUnknownMarkers(['no markers'], known)).toEqual(['no markers']);
  });
});

describe('groupMarkers', () => {
  it('collapses adjacent ids into one group', () => {
    expect(groupMarkers(['rate.', 1, 3, 5, ' next'])).toEqual(['rate.', [1, 3, 5], ' next']);
  });

  it('keeps ids separated by text in their own groups', () => {
    expect(groupMarkers(['a', 1, ' b', 2])).toEqual(['a', [1], ' b', [2]]);
  });

  it('passes plain text through', () => {
    expect(groupMarkers(['no markers'])).toEqual(['no markers']);
  });

  it('handles an empty list', () => {
    expect(groupMarkers([])).toEqual([]);
  });
});
