import { usePositioningHistory } from '../../api/queries';
import LookbackControl from '../controls/LookbackControl';
import Panel from '../panel/Panel';
import { MIN_POINTS } from '../panel/minPoints';
import { panelState } from '../panel/panelState';
import { useCurrency } from '../../settings/store';
import { useLookback } from '../controls/useLookback';
import OIHistoryChart from './OIHistoryChart';

export default function OIHistorySection() {
  const { window, setWindow, resolution } = useLookback();
  const query = usePositioningHistory(useCurrency(), window, resolution);
  const state = panelState(query, query.data, query.data?.points.length ?? 0, MIN_POINTS.line);

  return (
    <Panel
      title="OPEN INTEREST HISTORY"
      subtitle="CONTRACTS · CALLS/PUTS · P/C × TIME"
      state={state}
      controls={<LookbackControl window={window} onChange={setWindow} />}
    >
      {(data) => <OIHistoryChart data={data} />}
    </Panel>
  );
}
