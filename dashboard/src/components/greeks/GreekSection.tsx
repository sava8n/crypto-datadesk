import { useMemo, useState } from 'react';

import { useGreeksChain } from '../../hooks/useGreeksChain';
import type { GreekName } from '../../api/client';
import { useSettings } from '../../settings/store';
import { frontExpiry } from '../../utils/expiry';
import { expiryLabel } from '../../utils/format';
import GreekPanel, { type GreekPoint } from './GreekPanel';

interface Props {
  greek: GreekName;
  label: string;
  color: string;
  currency: string;
  valueFmt: (v: number) => string;
}

export default function GreekSection({ greek, label, color, currency, valueFmt }: Props) {
  const query = useGreeksChain(currency);
  const expiries = query.data?.expiries ?? [];
  const { frontExpiry: frontPref } = useSettings();

  const [picked, setPicked] = useState<string | null>(null);
  // fall back to the front expiry
  const selectedExpiry =
    picked && expiries.includes(picked) ? picked : frontExpiry(expiries, frontPref) ?? null;

  const points = useMemo<GreekPoint[]>(() => {
    if (!query.data || !selectedExpiry) return [];
    return query.data.points
      .filter((p) => p.expiry === selectedExpiry)
      .map((p) => ({ strike: p.strike, value: p[greek] }));
  }, [query.data, selectedExpiry, greek]);

  return (
    <section className="panel">
      <div className="panel__title">
        <span className="panel__title-main">{label}</span>
        <span className="panel__title-sub">BLACK-76 × STRIKE</span>
        <label className="expiry">
          <span className="expiry__label">EXPIRY</span>
          <select
            className="expiry__select"
            value={selectedExpiry ?? ''}
            onChange={(e) => setPicked(e.target.value)}
            disabled={expiries.length === 0}
          >
            {expiries.length === 0 && <option value="">-</option>}
            {expiries.map((iso) => (
              <option key={iso} value={iso}>
                {expiryLabel(iso)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="panel__body">
        {query.isLoading && <div className="panel__msg">LOADING {label}…</div>}
        {query.isError && (
          <div className="panel__msg panel__msg--err">
            ERR · {query.error?.message ?? 'REQUEST FAILED'}
          </div>
        )}
        {!query.isLoading && !query.isError && points.length < 2 && (
          <div className="panel__msg panel__msg--warn">INSUFFICIENT DATA · {points.length} PTS</div>
        )}
        {!query.isLoading && !query.isError && points.length >= 2 && (
          <GreekPanel points={points} label={label} color={color} valueFmt={valueFmt} />
        )}
      </div>
    </section>
  );
}
