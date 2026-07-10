import { useMemo, useState } from 'react';

import { useProbCurves } from '../../hooks/useProbCurves';
import { expiryLabel } from '../../utils/format';
import ProbDistributionPanel from './ProbDistributionPanel';

export default function ProbDistributionSection({ currency }: { currency: string }) {
  // same query key as the curves section, so the response is fetched once per currency
  const { data, isLoading, isError, error } = useProbCurves(currency);

  // unique expiries, near-dated first
  const expiries = useMemo(() => {
    if (!data) return [];
    const seen = new Map<string, number>();
    for (const p of data.points) {
      if (!seen.has(p.expiry)) seen.set(p.expiry, p.tte_years);
    }
    return [...seen.entries()].sort((a, b) => a[1] - b[1]).map(([iso]) => iso);
  }, [data]);

  const [picked, setPicked] = useState<string | null>(null);
  // fall back to the nearest expiry until the user picks one (or if the pick expired out)
  const selectedExpiry = picked && expiries.includes(picked) ? picked : expiries[0] ?? null;

  const points = useMemo(
    () => (data && selectedExpiry ? data.points.filter((p) => p.expiry === selectedExpiry) : []),
    [data, selectedExpiry],
  );

  return (
    <section className="panel">
      <div className="panel__title">
        <span className="panel__title-main">IMPLIED PROBABILITY DISTRIBUTION</span>
        <span className="panel__title-sub">STRIKE BUCKETS × P(K1&lt;S≤K2) · PER EXPIRY</span>
        <label className="expiry">
          <span className="expiry__label">EXPIRY</span>
          <select
            className="expiry__select"
            value={selectedExpiry ?? ''}
            onChange={(e) => setPicked(e.target.value)}
            disabled={expiries.length === 0}
          >
            {expiries.length === 0 && <option value="">—</option>}
            {expiries.map((iso) => (
              <option key={iso} value={iso}>
                {expiryLabel(iso)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="panel__body">
        {isLoading && <div className="panel__msg">LOADING DISTRIBUTION…</div>}
        {isError && (
          <div className="panel__msg panel__msg--err">
            ERR · {error?.message ?? 'REQUEST FAILED'}
          </div>
        )}
        {!isLoading && !isError && data && points.length < 4 && (
          <div className="panel__msg panel__msg--warn">
            INSUFFICIENT DATA · {points.length} PTS
          </div>
        )}
        {!isLoading && !isError && data && points.length >= 4 && (
          <ProbDistributionPanel points={points} spot={data.spot} />
        )}
      </div>
    </section>
  );
}
