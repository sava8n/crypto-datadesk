import { describe, expect, it } from 'vitest';
import { panelState } from './panelState';

const idle = { isLoading: false, isError: false };
const loading = { isLoading: true, isError: false };
const failed = { isLoading: false, isError: true };

describe('panelState', () => {
  it('reports loading while the query is in flight', () => {
    expect(panelState(loading, undefined, 0, 1)).toEqual({ kind: 'loading' });
  });

  it('prefers loading over error', () => {
    expect(panelState({ ...loading, isError: true }, undefined, 0, 1)).toEqual({
      kind: 'loading',
    });
  });

  it('reports a failure with a fixed message', () => {
    expect(panelState(failed, undefined, 0, 1)).toEqual({
      kind: 'error',
      message: 'SOMETHING WENT WRONG',
    });
  });

  // a poll fails on its own; blanking the panel would dispose the chart with it
  it('keeps a value that is already present when a refetch fails', () => {
    expect(panelState(failed, 'data', 10, 1)).toEqual({ kind: 'ready', data: 'data' });
  });

  it('reports sparse over an error when the value is present but thin', () => {
    expect(panelState(failed, 'data', 2, 3)).toEqual({ kind: 'sparse', count: 2 });
  });

  // settled-but-empty is still loading: the alternative flashes "0 PTS" before first paint
  it('treats a settled query with no value as loading', () => {
    expect(panelState(idle, undefined, 0, 1)).toEqual({ kind: 'loading' });
  });

  it('reports sparse below the threshold, carrying the count', () => {
    expect(panelState(idle, 'data', 2, 3)).toEqual({ kind: 'sparse', count: 2 });
  });

  it('is ready exactly at the threshold', () => {
    expect(panelState(idle, 'data', 3, 3)).toEqual({ kind: 'ready', data: 'data' });
  });

  it('is ready above the threshold', () => {
    expect(panelState(idle, 'data', 9, 1)).toEqual({ kind: 'ready', data: 'data' });
  });

  it('reports sparse for an empty value at a threshold of one', () => {
    expect(panelState(idle, [], 0, 1)).toEqual({ kind: 'sparse', count: 0 });
  });
});
