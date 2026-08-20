import { usePositioningHistory } from '../../api/queries';
import { useCurrency } from '../../settings/store';
import { Scopes } from '../controls/Scope';
import { LookbackScope } from '../controls/scopes';
import { useLookback } from '../controls/useLookback';
import { MIN_POINTS } from '../panel/minPoints';
import Panel from '../panel/Panel';
import { panelState } from '../panel/panelState';
import GEXLevelsHistoryChart from './GEXLevelsHistoryChart';

const CHART = 'gexLevelsHistory';

export default function GEXLevelsHistorySection() {
  const { window, resolution } = useLookback(CHART);
  const query = usePositioningHistory(useCurrency(), window, resolution);
  const state = panelState(query, query.data, query.data?.points.length ?? 0, MIN_POINTS.line);

  return (
    <Panel
      title="GEX & LEVELS HISTORY"
      subtitle="NET GEX · FLIP / MAX PAIN / SPOT × TIME"
      state={state}
      controls={
        <Scopes>
          <LookbackScope chartId={CHART} />
        </Scopes>
      }
    >
      {(data) => <GEXLevelsHistoryChart data={data} />}
    </Panel>
  );
}
