import type { CotMethod, CotWindow } from '../../api/client';
import { useCotIndex } from '../../hooks/useCotIndex';
import CotIndexPanel from './CotIndexPanel';
import { methodLabel } from './methods';
import { windowLabel } from './windows';

export default function CotIndexSection({
  window,
  method,
}: {
  window: CotWindow;
  method: CotMethod;
}) {
  const { data, isLoading, isError, error } = useCotIndex(window, method);
  const points = data?.points.length ?? 0;

  return (
    <section className="panel">
      <div className="panel__title">
        <span className="panel__title-main">COT INDEX</span>
        <span className="panel__title-sub">
          {methodLabel(method)} {windowLabel(window)} · 0–100 · 15/85 ZONES
        </span>
      </div>

      <div className="panel__body">
        {isLoading && <div className="panel__msg">LOADING COT INDEX…</div>}
        {isError && (
          <div className="panel__msg panel__msg--err">
            ERR · {error?.message ?? 'REQUEST FAILED'}
          </div>
        )}
        {!isLoading && !isError && data && points < 2 && (
          <div className="panel__msg panel__msg--warn">INSUFFICIENT DATA · {points} PTS</div>
        )}
        {!isLoading && !isError && data && points >= 2 && <CotIndexPanel data={data} />}
      </div>
    </section>
  );
}
