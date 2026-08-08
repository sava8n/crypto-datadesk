import { describe, it, expect } from 'vitest';

import { splitMarkers } from './markers';

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
