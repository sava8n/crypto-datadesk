import type { ReactNode } from 'react';

import { useExposureByStrike, useOIByStrike, useSpotHistory, useStats } from '../api/queries';
import { DEFAULT_SCOPE } from '../config';
import { useCurrency, useSettings } from '../settings/store';
import { resolveFrontExpiry } from '../utils/expiry';
import { dateLabel, dvolFmt, pctOne, pctWhole, priceWhole, usdShort } from '../utils/format';
import MarketSparkline from './MarketSparkline';
import { oiStats } from './oi/stats';

// pos/neg is the outcome axis; long/short the structural one (which side of gamma dealers hold)
type Outcome = 'pos' | 'neg';
type Regime = 'long' | 'short';

function Cell({ label, tone, children }: { label: string; tone?: Regime; children: ReactNode }) {
  return (
    <div className="strip__cell">
      <span className="strip__k">{label}</span>
      <span className={`strip__v${tone ? ` strip__v--${tone}` : ''}`}>{children}</span>
    </div>
  );
}

function Note({ tone, children }: { tone?: Outcome; children: ReactNode }) {
  return <span className={`strip__note${tone ? ` strip__note--${tone}` : ''}`}>{children}</span>;
}

// signed, so a negative reads "−$18.4M" rather than usdShort's "$-18.4M"
const signedUsd = (v: number) => `${v < 0 ? '−' : '+'}${usdShort(Math.abs(v))}`;
const signedPct = (v: number) => `${v < 0 ? '−' : '+'}${pctOne(Math.abs(v))}%`;

export default function MarketStrip() {
  const currency = useCurrency();
  const { stripTenor } = useSettings();
  const { data } = useStats(currency);
  const candles = useSpotHistory(currency).data?.candles;

  const weekly = stripTenor === 'weekly';
  const iv = weekly ? data?.iv7 : data?.iv30;
  const rv = weekly ? data?.rv7 : data?.rv30;

  // true percentile once enough archive has accrued; DVOL range position until then
  const pctl = data?.iv30_percentile;
  const rank = pctl ?? data?.dvol_rank;

  // per-expiry, so they follow the strip's tenor; the unfiltered call carries the expiry list
  const chain = useOIByStrike(currency);
  const oiExpiry = resolveFrontExpiry(chain.data?.expiries ?? [], stripTenor) ?? null;
  const slice = useOIByStrike(currency, oiExpiry, { enabled: oiExpiry != null });
  const oi = slice.data ? oiStats(slice.data) : null;

  // book-wide (every expiry), signed by the default convention since the sign toggle is per chart
  const gex = useExposureByStrike(currency, 'gamma', DEFAULT_SCOPE.exposureConvention).data;
  const netGex = gex ? gex.points.reduce((sum, p) => sum + p.net_exposure, 0) : null;
  const flip = gex?.gex_flip ?? null;
  const flipVsSpot = flip != null && data?.spot ? flip / data.spot - 1 : null;

  const last = candles?.[candles.length - 1];
  const prev = candles?.[candles.length - 2];
  const change = last && prev && prev.close !== 0 ? last.close / prev.close - 1 : null;
  const tone: Outcome = change != null && change < 0 ? 'neg' : 'pos';

  return (
    <header className="strip">
      <div className="strip__spot">
        <span className="strip__k">{currency}-USD · SPOT</span>
        <div className="strip__spot-row">
          <span className="strip__price">
            {data?.spot != null ? `$${priceWhole(data.spot)}` : '-'}
          </span>
          {change != null && (
            <span className={`strip__chg strip__chg--${tone}`}>{signedPct(change)}</span>
          )}
        </div>
      </div>

      {candles && candles.length > 1 && <MarketSparkline candles={candles} />}

      <div className="strip__cells">
        <Cell label="DVOL">
          {data?.dvol != null ? dvolFmt(data.dvol) : '-'}
          {rank != null && (
            <Note>
              {pctl != null ? 'IV PCTL' : 'RANK'} {pctWhole(rank)}
            </Note>
          )}
        </Cell>

        <Cell label={weekly ? 'IV7 / RV7' : 'IV30 / RV30'}>
          {iv != null && rv != null ? `${pctWhole(iv)} / ${pctWhole(rv)}` : '-'}
          {iv != null && rv != null && (
            <Note tone={iv >= rv ? 'pos' : 'neg'}>
              {iv >= rv ? '+' : '−'}
              {dvolFmt(Math.abs(iv - rv))} VRP
            </Note>
          )}
        </Cell>

        <Cell label="NET GEX" tone={netGex == null ? undefined : netGex >= 0 ? 'long' : 'short'}>
          {netGex != null ? signedUsd(netGex) : '-'}
          {netGex != null && <Note>{netGex >= 0 ? 'LONG' : 'SHORT'}</Note>}
        </Cell>

        <Cell label="FLIP">
          {flip != null ? `$${priceWhole(flip)}` : '-'}
          {flipVsSpot != null && <Note>{signedPct(flipVsSpot)}</Note>}
        </Cell>

        <Cell label="P/C">{oi?.pcRatio != null ? oi.pcRatio.toFixed(2) : '-'}</Cell>

        <Cell label="MAX PAIN">
          {oi?.maxPain != null ? `$${priceWhole(oi.maxPain)}` : '-'}
          {oiExpiry && <Note>{dateLabel(oiExpiry)}</Note>}
        </Cell>
      </div>
    </header>
  );
}
