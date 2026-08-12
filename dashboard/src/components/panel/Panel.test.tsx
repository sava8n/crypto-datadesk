import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import Panel from './Panel';
import type { PanelState } from './panelState';

const renderPanel = (state: PanelState<string>, extra: Record<string, unknown> = {}) =>
  render(
    <Panel title="25Δ SKEW" subtitle="RR / BF" state={state} {...extra}>
      {(data) => <div data-testid="chart">{data}</div>}
    </Panel>,
  );

const body = () => document.querySelector('.panel__body') as HTMLElement;

describe('Panel', () => {
  it('always shows the title and subtitle', () => {
    renderPanel({ kind: 'loading' });
    expect(screen.getByText('25Δ SKEW')).toBeDefined();
    expect(screen.getByText('RR / BF')).toBeDefined();
  });

  it('derives the loading message from the title', () => {
    renderPanel({ kind: 'loading' });
    expect(body().textContent).toBe('LOADING 25Δ SKEW…');
  });

  it('shows the error message', () => {
    renderPanel({ kind: 'error', message: 'upstream down' });
    expect(body().textContent).toBe('ERR · upstream down');
    expect(document.querySelector('.panel__msg--err')).not.toBeNull();
  });

  it('shows a plain message when sparse', () => {
    renderPanel({ kind: 'sparse', count: 2 });
    expect(body().textContent).toBe('INSUFFICIENT DATA');
    expect(document.querySelector('.panel__msg--err')).toBeNull();
  });

  it('shows the empty message without error styling', () => {
    renderPanel({ kind: 'empty', message: 'NO REPORT YET' });
    expect(body().textContent).toBe('NO REPORT YET');
    expect(document.querySelector('.panel__msg--err')).toBeNull();
  });

  it('renders children with the ready data', () => {
    renderPanel({ kind: 'ready', data: 'payload' });
    expect(screen.getByTestId('chart').textContent).toBe('payload');
  });

  it.each([
    ['loading', { kind: 'loading' }],
    ['error', { kind: 'error', message: 'x' }],
    ['sparse', { kind: 'sparse', count: 0 }],
    ['empty', { kind: 'empty', message: 'm' }],
    ['ready', { kind: 'ready', data: 'd' }],
  ] as const)('puts exactly one element in the body when %s', (_label, state) => {
    renderPanel(state as PanelState<string>);
    expect(body().children.length).toBe(1);
  });

  it('places controls in the title row, not the body', () => {
    renderPanel({ kind: 'loading' }, { controls: <button type="button">DTE</button> });
    expect(document.querySelector('.panel__title button')).not.toBeNull();
    expect(body().querySelector('button')).toBeNull();
  });

  it('renders the footer outside the body, and only when ready', () => {
    const footer = (d: string) => <div data-testid="tiles">{d}</div>;

    renderPanel({ kind: 'loading' }, { footer });
    expect(screen.queryByTestId('tiles')).toBeNull();

    renderPanel({ kind: 'ready', data: 'stats' }, { footer });
    const tiles = screen.getByTestId('tiles');
    expect(tiles.textContent).toBe('stats');
    expect(tiles.closest('.panel__body')).toBeNull();
  });

  it('adds the full modifier only when asked', () => {
    const { container } = renderPanel({ kind: 'loading' });
    expect(container.querySelector('section')?.className).toBe('panel');

    const wide = renderPanel({ kind: 'loading' }, { full: true });
    expect(wide.container.querySelector('section')?.className).toBe('panel panel--full');
  });
});
