import { useMemo } from 'react';

import { useProbCurves, useSpotHistory } from '../../api/queries';
import { useCurrency, useSettings } from '../../settings/store';
import { resolveExpiry } from '../../utils/expiry';
import { dateLabel } from '../../utils/format';
import { MIN_POINTS } from '../panel/minPoints';
import Panel from '../panel/Panel';
import { panelState } from '../panel/panelState';
import { buildCone, coneAnchor } from './cone';
import type { Cone } from './ExpectedMoveConePrimitive';
import SpotHistoryChart from './SpotHistoryChart';

export default function SpotHistorySection() {
  const currency = useCurrency();
  const { expiry: expiryPref } = useSettings();

  const query = useSpotHistory(currency);
  const candles = query.data?.candles;

  // the implied distribution is already fetched by the probabilities tab, so the
  // overlay shares that cache entry rather than costing a request of its own
  const prob = useProbCurves(currency);
  const expiry = prob.data
    ? resolveExpiry(
        expiryPref,
        prob.data.quantiles.map((q) => q.expiry),
      )
    : undefined;

  const cone = useMemo((): Cone | undefined => {
    const anchor = coneAnchor(prob.data, expiry);
    const last = candles?.[candles.length - 1];
    if (!anchor || !last || prob.data == null) return undefined;
    const points = buildCone(prob.data.spot, anchor, last.ts.slice(0, 10));
    return points.length ? { expiry: anchor.expiry, points } : undefined;
  }, [prob.data, expiry, candles]);

  const state = panelState(query, candles, candles?.length ?? 0, MIN_POINTS.line);
  const tenor = cone ? ` · EM ${dateLabel(cone.expiry)}` : '';

  return (
    <Panel title="MARKET" subtitle={`${currency}_USDC · 1D${tenor}`} state={state} full>
      {(data) => <SpotHistoryChart candles={data} cone={cone} />}
    </Panel>
  );
}
