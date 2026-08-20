import { useMemo } from 'react';

import { useVolHistory } from '../../api/queries';
import { useCurrency } from '../../settings/store';
import { resolutionFor } from '../controls/useLookback';
import { MIN_POINTS } from '../panel/minPoints';
import Panel from '../panel/Panel';
import { panelState } from '../panel/panelState';
import VRPChart from './VRPChart';
import { pairForwardRealized } from './vrp';

// pinned: a pair needs rv30 archived 30d after its iv30, so shorter windows show almost nothing
const WINDOW = '1y';

export default function VRPSection() {
  const query = useVolHistory(useCurrency(), WINDOW, resolutionFor(WINDOW));
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
