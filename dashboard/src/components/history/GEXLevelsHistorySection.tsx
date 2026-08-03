import { usePositioningHistory } from '../../api/queries';
import LookbackControl from '../controls/LookbackControl';
import Panel from '../panel/Panel';
import { MIN_POINTS } from '../panel/minPoints';
import { panelState } from '../panel/panelState';
import { useCurrency } from '../../settings/store';
import { useLookback } from '../controls/useLookback';
import GEXLevelsHistoryChart from './GEXLevelsHistoryChart';

export default function GEXLevelsHistorySection() {
  const { window, setWindow, resolution } = useLookback();
  const query = usePositioningHistory(useCurrency(), window, resolution);
  const state = panelState(query, query.data, query.data?.points.length ?? 0, MIN_POINTS.line);

  return (
    <Panel
      title="GEX & LEVELS HISTORY"
      subtitle="NET GEX · FLIP / MAX PAIN / SPOT × TIME"
      state={state}
      controls={<LookbackControl window={window} onChange={setWindow} />}
    >
      {(data) => <GEXLevelsHistoryChart data={data} />}
    </Panel>
  );
}
