import { useMemo } from 'react';

import { useVolHistory } from '../../api/queries';
import LookbackControl from '../controls/LookbackControl';
import Panel from '../panel/Panel';
import { MIN_POINTS } from '../panel/minPoints';
import { panelState } from '../panel/panelState';
import { useCurrency } from '../../settings/store';
import { useLookback } from '../controls/useLookback';
import VrpChart from './VrpChart';
import { pairForwardRealized } from './vrp';

export default function VrpSection() {
  // pinned past the shared default: a pair needs rv30 archived 30d after its iv30,
  // so anything shorter than a year shows almost nothing
  const { days, setDays, resolution } = useLookback(365);
  const query = useVolHistory(useCurrency(), days, resolution);
  // every pair needs iv30(t) and rv30(t+30d) both archived, so the series starts
  // one horizon after the archive does
  const rows = useMemo(
    () => (query.data ? pairForwardRealized(query.data.points) : undefined),
    [query.data],
  );
  const state = panelState(query, rows, rows?.length ?? 0, MIN_POINTS.line);

  return (
    <Panel
      title="VOL RISK PREMIUM"
      subtitle="IV30(t) VS RV30(t+30D) × TIME"
      state={state}
      controls={<LookbackControl days={days} onChange={setDays} />}
    >
      {(data) => <VrpChart rows={data} />}
    </Panel>
  );
}
