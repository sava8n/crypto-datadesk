import { useMemo, useState } from 'react';

import { useGreek } from '../../hooks/useGreek';
import { expiryLabel } from '../../utils/format';
import DeltaPanel from './DeltaPanel';
import GammaPanel from './GammaPanel';
import ThetaPanel from './ThetaPanel';
import VegaPanel from './VegaPanel';

export default function GreeksSection({ currency }: { currency: string }) {
  // drives the expiry list, the four greek panels each run their own
  const deltaQuery = useGreek('delta', currency);

  // sorted unique expiries (near-dated first) for the selector.
  const expiries = useMemo(() => {
    const tteByExpiry = new Map<string, number>();
    for (const p of deltaQuery.data?.points ?? []) {
      if (!tteByExpiry.has(p.expiry)) tteByExpiry.set(p.expiry, p.tte_years);
    }
    return [...tteByExpiry.entries()].sort((a, b) => a[1] - b[1]).map(([iso]) => iso);
  }, [deltaQuery.data]);

  const [picked, setPicked] = useState<string | null>(null);
  // fall back to the nearest expiry until the user picks one (or if the pick expired out).
  const selectedExpiry = picked && expiries.includes(picked) ? picked : expiries[0] ?? null;

  return (
    <section className="greeks">
      <div className="greeks__bar">
        <span className="greeks__title">OPTION GREEKS</span>
        <span className="greeks__sub">BLACK-76 · PER CONTRACT × STRIKE · SOURCE DERIBIT</span>
        <label className="greeks__selector">
          <span className="greeks__selector-label">EXPIRY</span>
          <select
            className="greeks__select"
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

      <div className="greeks__grid">
        <DeltaPanel currency={currency} selectedExpiry={selectedExpiry} />
        <GammaPanel currency={currency} selectedExpiry={selectedExpiry} />
        <ThetaPanel currency={currency} selectedExpiry={selectedExpiry} />
        <VegaPanel currency={currency} selectedExpiry={selectedExpiry} />
      </div>
    </section>
  );
}
