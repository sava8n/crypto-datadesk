import { usePositioningHistory } from '../../api/queries';
import { HISTORY_RESOLUTION, HISTORY_WINDOW } from '../../config';
import { useCurrency } from '../../settings/store';
import { MIN_POINTS } from '../panel/minPoints';
import Panel from '../panel/Panel';
import { panelState } from '../panel/panelState';
import GEXLevelsHistoryChart from './GEXLevelsHistoryChart';

export default function GEXLevelsHistorySection() {
  const query = usePositioningHistory(useCurrency(), HISTORY_WINDOW, HISTORY_RESOLUTION);
  const state = panelState(query, query.data, query.data?.points.length ?? 0, MIN_POINTS.line);

  return (
    <Panel
      title="GEX & LEVELS HISTORY"
      subtitle="NET GEX · FLIP / MAX PAIN / SPOT × TIME"
      state={state}
    >
      {(data) => <GEXLevelsHistoryChart data={data} />}
    </Panel>
  );
}
