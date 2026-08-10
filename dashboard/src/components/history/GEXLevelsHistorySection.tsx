import { usePositioningHistory } from '../../api/queries';
import Panel from '../panel/Panel';
import { MIN_POINTS } from '../panel/minPoints';
import { panelState } from '../panel/panelState';
import { useCurrency } from '../../settings/store';
import { useLookback } from '../controls/useLookback';
import GEXLevelsHistoryChart from './GEXLevelsHistoryChart';

export default function GEXLevelsHistorySection() {
  const { window, resolution } = useLookback();
  const query = usePositioningHistory(useCurrency(), window, resolution);
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
