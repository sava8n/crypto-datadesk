import { usePositioningHistory } from '../../api/queries';
import { HISTORY_RESOLUTION, HISTORY_WINDOW } from '../../config';
import { useCurrency } from '../../settings/store';
import { MIN_POINTS } from '../panel/minPoints';
import Panel from '../panel/Panel';
import { panelState } from '../panel/panelState';
import OIHistoryChart from './OIHistoryChart';

export default function OIHistorySection() {
  const query = usePositioningHistory(useCurrency(), HISTORY_WINDOW, HISTORY_RESOLUTION);
  const state = panelState(query, query.data, query.data?.points.length ?? 0, MIN_POINTS.line);

  return (
    <Panel
      title="OPEN INTEREST HISTORY"
      subtitle="CONTRACTS · CALLS/PUTS · P/C × TIME"
      state={state}
    >
      {(data) => <OIHistoryChart data={data} />}
    </Panel>
  );
}
