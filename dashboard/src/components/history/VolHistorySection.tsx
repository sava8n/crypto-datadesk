import { useVolHistory } from '../../api/queries';
import { useCurrency } from '../../settings/store';
import { Scopes } from '../controls/Scope';
import { LookbackScope } from '../controls/scopes';
import { useLookback } from '../controls/useLookback';
import { MIN_POINTS } from '../panel/minPoints';
import Panel from '../panel/Panel';
import { panelState } from '../panel/panelState';
import VolHistoryChart from './VolHistoryChart';

const CHART = 'volHistory';

export default function VolHistorySection() {
  const { window, resolution } = useLookback(CHART);
  const query = useVolHistory(useCurrency(), window, resolution);
  const state = panelState(query, query.data, query.data?.points.length ?? 0, MIN_POINTS.line);

  return (
    <Panel
      title="VOL HISTORY"
      subtitle="CM ATM IV / RV / DVOL × TIME"
      state={state}
      controls={
        <Scopes>
          <LookbackScope chartId={CHART} />
        </Scopes>
      }
    >
      {(data) => <VolHistoryChart data={data} />}
    </Panel>
  );
}
