import { useMemo } from 'react';

import { useVolHistory } from '../../api/queries';
import { HISTORY_RESOLUTION, HISTORY_WINDOW } from '../../config';
import { useCurrency } from '../../settings/store';
import { MIN_POINTS } from '../panel/minPoints';
import Panel from '../panel/Panel';
import { panelState } from '../panel/panelState';
import VRPChart from './VRPChart';
import { pairForwardRealized } from './vrp';

export default function VRPSection() {
  const query = useVolHistory(useCurrency(), HISTORY_WINDOW, HISTORY_RESOLUTION);
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
