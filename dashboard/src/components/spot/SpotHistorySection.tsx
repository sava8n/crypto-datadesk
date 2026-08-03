import { useMemo } from 'react';

import { useProbCurves, useSpotHistory } from '../../api/queries';
import { useCurrency, useSettings } from '../../settings/store';
import { frontExpiry } from '../../utils/expiry';
import { expiryLabel } from '../../utils/format';
import Panel from '../panel/Panel';
import { MIN_POINTS } from '../panel/minPoints';
import { panelState } from '../panel/panelState';
import SpotHistoryChart from './SpotHistoryChart';
import type { Cone } from './ExpectedMoveConePrimitive';
import { buildCone, coneAnchor } from './cone';

export default function SpotHistorySection() {
  const currency = useCurrency();
  const { frontExpiry: frontPref } = useSettings();

  const query = useSpotHistory(currency);
  const candles = query.data?.candles;

  // the implied distribution is already fetched by the probabilities tab, so the
  // overlay shares that cache entry rather than costing a request of its own
  const prob = useProbCurves(currency);
  const expiry = prob.data
    ? frontExpiry(
        prob.data.quantiles.map((q) => q.expiry),
        frontPref,
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
  const tenor = cone ? ` · EM ${expiryLabel(cone.expiry)}` : '';

  return (
    <Panel title="MARKET" subtitle={`${currency}_USDC · 1D${tenor}`} state={state} full>
      {(data) => <SpotHistoryChart candles={data} cone={cone} />}
    </Panel>
  );
}
