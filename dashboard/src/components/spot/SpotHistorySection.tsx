import { useMemo } from 'react';

import { useGEXByStrike } from '../../hooks/useGEXByStrike';
import { useOIByStrike } from '../../hooks/useOIByStrike';
import { useSpotHistory } from '../../hooks/useSpotHistory';
import SpotHistoryPanel from './SpotHistoryPanel';
import { buildLevels } from './levels';

export default function SpotHistorySection({ currency }: { currency: string }) {
  const { data, isLoading, isError, error } = useSpotHistory(currency);
  const candles = data?.candles ?? [];

  // options-derived levels
  const gex = useGEXByStrike(currency);
  const oiAll = useOIByStrike(currency);
  const frontExpiry = oiAll.data?.expiries[0];
  const oiFront = useOIByStrike(currency, frontExpiry);
  const levels = useMemo(
    () => buildLevels(gex.data, oiAll.data, oiFront.data),
    [gex.data, oiAll.data, oiFront.data],
  );

  return (
    <section className="panel panel--full">
      <div className="panel__title">
        <span className="panel__title-main">MARKET</span>
        <span className="panel__title-sub">{currency}_USDC · 1D</span>
      </div>
      <div className="panel__body">
        {isLoading && <div className="panel__msg">LOADING MARKET…</div>}
        {isError && (
          <div className="panel__msg panel__msg--err">
            ERR · {error?.message ?? 'REQUEST FAILED'}
          </div>
        )}
        {!isLoading && !isError && candles.length < 2 && (
          <div className="panel__msg panel__msg--warn">INSUFFICIENT DATA · {candles.length} PTS</div>
        )}
        {!isLoading && !isError && candles.length >= 2 && (
          <SpotHistoryPanel candles={candles} levels={levels} />
        )}
      </div>
    </section>
  );
}
