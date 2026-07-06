import { useMemo, useState } from 'react';

import { MAX_DTE, MIN_DTE } from '../../config';
import { useIVSurface } from '../../hooks/useIVSurface';
import { filterByDTE } from '../../utils/dte';
import DTEControl from '../shared/DTEControl';
import IVSurfacePanel from './IVSurfacePanel';

export default function IVSurfaceSection({ currency }: { currency: string }) {
  const { data, isLoading, isError, error } = useIVSurface(currency);

  const [minDte, setMinDte] = useState(MIN_DTE);
  const [maxDte, setMaxDte] = useState(MAX_DTE);
  const windowed = useMemo(
    () => (data ? { ...data, points: filterByDTE(data.points, minDte, maxDte) } : undefined),
    [data, minDte, maxDte],
  );
  const points = windowed?.points.length ?? 0;

  return (
    <main className="panel">
      <div className="panel__title">
        <span className="panel__title-main">IMPLIED VOLATILITY SURFACE</span>
        <span className="panel__title-sub">3D · DELTA × EXPIRY × IV</span>
        <DTEControl
          defaultMin={MIN_DTE}
          defaultMax={MAX_DTE}
          onChange={(min, max) => {
            setMinDte(min);
            setMaxDte(max);
          }}
        />
      </div>
      <div className="panel__body">
        {isLoading && <div className="panel__msg">LOADING SURFACE…</div>}
        {isError && (
          <div className="panel__msg panel__msg--err">
            ERR · {error?.message ?? 'REQUEST FAILED'}
          </div>
        )}
        {!isLoading && !isError && windowed && points < 4 && (
          <div className="panel__msg panel__msg--warn">INSUFFICIENT DATA · {points} PTS</div>
        )}
        {!isLoading && !isError && windowed && points >= 4 && <IVSurfacePanel data={windowed} />}
      </div>
    </main>
  );
}
