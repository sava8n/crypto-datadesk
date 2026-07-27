import type { ReactNode } from 'react';

import type { PanelState } from './panelState';

interface Props<T> {
  title: string;
  subtitle: ReactNode;
  state: PanelState<T>;
  // DTE window or expiry picker
  // `.dte`/`.expiry` right-align themselves in the title row
  controls?: ReactNode;
  // rendered below the body, outside its absolute-positioned box
  footer?: (data: T) => ReactNode;
  full?: boolean;
  children: (data: T) => ReactNode;
}

/**
 * The panel frame and its four body states.
 *
 * `.panel__body > *` is `position: absolute; inset: 0`, so the body must contain
 * exactly one element - neither this component nor `children` may add a wrapper,
 * or the centred messages collapse into the corner.
 */
export default function Panel<T>({
  title,
  subtitle,
  state,
  controls,
  footer,
  full,
  children,
}: Props<T>) {
  return (
    <section className={full ? 'panel panel--full' : 'panel'}>
      <div className="panel__title">
        <span className="panel__title-main">{title}</span>
        <span className="panel__title-sub">{subtitle}</span>
        {controls}
      </div>

      <div className="panel__body">
        {state.kind === 'loading' && <div className="panel__msg">LOADING {title}…</div>}
        {state.kind === 'error' && (
          <div className="panel__msg panel__msg--err">ERR · {state.message}</div>
        )}
        {state.kind === 'sparse' && (
          <div className="panel__msg panel__msg--warn">INSUFFICIENT DATA · {state.count} PTS</div>
        )}
        {state.kind === 'ready' && children(state.data)}
      </div>

      {state.kind === 'ready' && footer?.(state.data)}
    </section>
  );
}
