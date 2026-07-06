import { useMemo, useState } from 'react';

import { MAX_DTE, MIN_DTE } from '../../config';
import { useTermStructure } from '../../hooks/useTermStructure';
import { filterByDTE } from '../../utils/dte';
import DTEControl from '../shared/DTEControl';
import BasisPanel from './BasisPanel';

export default function BasisSection({ currency }: { currency: string }) {
  const { data, isLoading, isError, error } = useTermStructure(currency);

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
        <span className="panel__title-main">BASIS</span>
        <span className="panel__title-sub">ANN. (F/S−1)/T × EXPIRY</span>
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
        {isLoading && <div className="panel__msg">LOADING BASIS…</div>}
        {isError && (
          <div className="panel__msg panel__msg--err">
            ERR · {error?.message ?? 'REQUEST FAILED'}
          </div>
        )}
        {!isLoading && !isError && windowed && points < 3 && (
          <div className="panel__msg panel__msg--warn">INSUFFICIENT DATA · {points} PTS</div>
        )}
        {!isLoading && !isError && windowed && points >= 3 && <BasisPanel data={windowed} />}
      </div>
    </section>
  );
}
