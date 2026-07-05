import { useState } from 'react';

import { useGreeksChain } from '../../hooks/useGreeksChain';
import { expiryLabel } from '../../utils/format';
import DeltaPanel from './DeltaPanel';
import GammaPanel from './GammaPanel';
import ThetaPanel from './ThetaPanel';
import VegaPanel from './VegaPanel';

export default function GreeksSection({ currency }: { currency: string }) {
  const { data } = useGreeksChain(currency);
  const expiries = data?.expiries ?? [];

  const [picked, setPicked] = useState<string | null>(null);
  // fall back to the nearest expiry until the user picks one (or if the pick expired out).
  const selectedExpiry = picked && expiries.includes(picked) ? picked : expiries[0] ?? null;

  return (
    <section className="greeks">
      <div className="greeks__bar">
        <span className="greeks__title">OPTION GREEKS</span>
        <span className="greeks__sub">BLACK-76 · PER CONTRACT × STRIKE</span>
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
