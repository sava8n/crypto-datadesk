import { useMemo } from 'react';

import { useVolHistory } from '../../api/queries';
import { useCurrency } from '../../settings/store';
import { resolutionFor } from '../controls/useLookback';
import { MIN_POINTS } from '../panel/minPoints';
import Panel from '../panel/Panel';
import { panelState } from '../panel/panelState';
import VRPChart from './VRPChart';
import { pairForwardRealized } from './vrp';

// no lookback control: a pair needs rv30 archived 30d after its iv30, so anything
// shorter than a year shows almost nothing
const WINDOW = '1y';

export default function VRPSection() {
  const query = useVolHistory(useCurrency(), WINDOW, resolutionFor(WINDOW));
  // every pair needs iv30(t) and rv30(t+30d) both archived, so the series starts
  // one horizon after the archive does
  const rows = useMemo(
    () => (query.data ? pairForwardRealized(query.data.points) : undefined),
    [query.data],
  );
  const state = panelState(query, rows, rows?.length ?? 0, MIN_POINTS.line);

  return (
    <Panel title="VOL RISK PREMIUM" subtitle="IV30(t) VS RV30(t+30D) × TIME" state={state}>
      {(data) => <VRPChart rows={data} />}
    </Panel>
  );
}
