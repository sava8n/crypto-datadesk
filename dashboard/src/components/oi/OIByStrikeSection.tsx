import { useState } from 'react';

import { useOIByStrike } from '../../hooks/useOIByStrike';
import { expiryLabel } from '../../utils/format';
import OIByStrikePanel from './OIByStrikePanel';
import OIStatTiles from './OIStatTiles';

export default function OIByStrikeSection({ currency }: { currency: string }) {
  // "" = all expirations; otherwise an expiry ISO string.
  const [picked, setPicked] = useState('');
  const { data, isLoading, isError, error } = useOIByStrike(currency, picked || null);

  const points = data?.points.length ?? 0;
  const expiries = data?.expiries ?? [];

  return (
    <section className="panel">
      <div className="panel__title">
        <span className="panel__title-main">OPEN INTEREST BY STRIKE</span>
        <span className="panel__title-sub">CONTRACTS · ITM/OTM × STRIKE</span>
        <label className="expiry">
          <span className="expiry__label">EXPIRY</span>
          <select
            className="expiry__select"
            value={picked}
            onChange={(e) => setPicked(e.target.value)}
          >
            <option value="">ALL EXPIRATIONS</option>
            {expiries.map((iso) => (
              <option key={iso} value={iso}>
                {expiryLabel(iso)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="panel__body">
        {isLoading && <div className="panel__msg">LOADING OPEN INTEREST…</div>}
        {isError && (
          <div className="panel__msg panel__msg--err">
            ERR · {error?.message ?? 'REQUEST FAILED'}
          </div>
        )}
        {!isLoading && !isError && data && points < 1 && (
          <div className="panel__msg panel__msg--warn">INSUFFICIENT DATA · {points} PTS</div>
        )}
        {!isLoading && !isError && data && points >= 1 && <OIByStrikePanel data={data} />}
      </div>

      {!isLoading && !isError && data && points >= 1 && <OIStatTiles data={data} />}
    </section>
  );
}
