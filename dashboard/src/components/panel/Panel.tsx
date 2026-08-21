import type { ReactNode } from 'react';

import type { PanelState } from './panelState';

interface Props<T> {
  title: string;
  subtitle?: ReactNode;
  state: PanelState<T>;
  controls?: ReactNode;
  // rendered outside the body's absolute-positioned box
  footer?: (data: T) => ReactNode;
  children: (data: T) => ReactNode;
}

/**
 * `.panel__body > *` is `position: absolute; inset: 0`, so the body must contain exactly one
 * element: neither this component nor `children` may add a wrapper.
 */
export default function Panel<T>({ title, subtitle, state, controls, footer, children }: Props<T>) {
  return (
    <section className="panel">
      <div className="panel__title">
        <span className="panel__title-main">{title}</span>
        {subtitle != null && <span className="panel__title-sub">{subtitle}</span>}
        {controls}
      </div>

      <div className="panel__body">
        {state.kind === 'loading' && <div className="panel__msg">LOADING {title}…</div>}
        {state.kind === 'error' && (
          <div className="panel__msg panel__msg--err">ERR · {state.message}</div>
        )}
        {state.kind === 'sparse' && <div className="panel__msg">INSUFFICIENT DATA</div>}
        {state.kind === 'empty' && <div className="panel__msg">{state.message}</div>}
        {state.kind === 'ready' && children(state.data)}
      </div>

      {state.kind === 'ready' && footer?.(state.data)}
    </section>
  );
}
