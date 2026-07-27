import { useMemo } from 'react';

import { useGEXByStrike, useOIByStrike, useProbCurves, useSpotHistory } from '../../api/queries';
import { useCurrency, useSettings } from '../../settings/store';
import { frontExpiry } from '../../utils/expiry';
import Panel from '../panel/Panel';
import { MIN_POINTS } from '../panel/minPoints';
import { panelState } from '../panel/panelState';
import SpotHistoryChart from './SpotHistoryChart';
import { buildLevels, buildQuantileBand } from './levels';

export default function SpotHistorySection() {
  const currency = useCurrency();
  const { frontExpiry: frontPref, levels: levelCfg } = useSettings();

  const query = useSpotHistory(currency);

  // options-derived overlays; these queries share their cache entries with the
  // positioning and probability tabs, so opening this panel costs no extra fetch
  const gex = useGEXByStrike(currency);
  const oiAll = useOIByStrike(currency);
  const front = oiAll.data ? frontExpiry(oiAll.data.expiries, frontPref) : undefined;
  const oiFront = useOIByStrike(currency, front);
  const prob = useProbCurves(currency);

  const levels = useMemo(
    () => buildLevels(gex.data, oiAll.data, oiFront.data, levelCfg),
    [gex.data, oiAll.data, oiFront.data, levelCfg],
  );
  const band = useMemo(() => buildQuantileBand(prob.data, front), [prob.data, front]);

  const candles = query.data?.candles;
  const state = panelState(query, candles, candles?.length ?? 0, MIN_POINTS.line);

  return (
    <Panel title="MARKET" subtitle={`${currency}_USDC · 1D`} state={state} full>
      {(data) => <SpotHistoryChart candles={data} levels={levels} band={band} />}
    </Panel>
  );
}
