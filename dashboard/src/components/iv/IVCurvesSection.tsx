import { useMemo, useState } from 'react';

import { MAX_DTE, MIN_DTE } from '../../config';
import { useIVCurves } from '../../hooks/useIVCurves';
import { filterByDTE } from '../../utils/dte';
import DTEControl from '../shared/DTEControl';
import IVCurvesPanel from './IVCurvesPanel';

export default function IVCurvesSection({ currency }: { currency: string }) {
  const { data, isLoading, isError, error } = useIVCurves(currency);

  const [minDte, setMinDte] = useState(MIN_DTE);
  const [maxDte, setMaxDte] = useState(MAX_DTE);
  const windowed = useMemo(
    () => (data ? { ...data, points: filterByDTE(data.points, minDte, maxDte) } : undefined),
    [data, minDte, maxDte],
  );
  const points = windowed?.points.length ?? 0;

  return (
    <section className="panel">
      <div className="panel__title">
        <span className="panel__title-main">IMPLIED VOLATILITY CURVES</span>
        <span className="panel__title-sub">2D · STRIKE × IV · PER EXPIRY</span>
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
        {isLoading && <div className="panel__msg">LOADING CURVES…</div>}
        {isError && (
          <div className="panel__msg panel__msg--err">
            ERR · {error?.message ?? 'REQUEST FAILED'}
          </div>
        )}
        {!isLoading && !isError && windowed && points < 4 && (
          <div className="panel__msg panel__msg--warn">INSUFFICIENT DATA · {points} PTS</div>
        )}
        {!isLoading && !isError && windowed && points >= 4 && <IVCurvesPanel data={windowed} />}
      </div>
    </section>
  );
}
