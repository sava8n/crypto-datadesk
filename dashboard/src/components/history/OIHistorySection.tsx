import { usePositioningHistory } from '../../api/queries';
import LookbackControl from '../controls/LookbackControl';
import Panel from '../panel/Panel';
import { MIN_POINTS } from '../panel/minPoints';
import { panelState } from '../panel/panelState';
import { useCurrency } from '../../settings/store';
import { useLookback } from '../controls/useLookback';
import OIHistoryChart from './OIHistoryChart';

export default function OIHistorySection() {
  const { days, setDays, resolution } = useLookback();
  const query = usePositioningHistory(useCurrency(), days, resolution);
  const state = panelState(query, query.data, query.data?.points.length ?? 0, MIN_POINTS.line);

  return (
    <Panel
      title="OPEN INTEREST HISTORY"
      subtitle="CONTRACTS · CALLS/PUTS · P/C × TIME"
      state={state}
      controls={<LookbackControl days={days} onChange={setDays} />}
    >
      {(data) => <OIHistoryChart data={data} />}
    </Panel>
  );
}
