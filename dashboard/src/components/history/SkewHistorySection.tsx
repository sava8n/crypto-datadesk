import { useVolHistory } from '../../api/queries';
import { useCurrency } from '../../settings/store';
import { Scopes } from '../controls/Scope';
import { LookbackScope } from '../controls/scopes';
import { useLookback } from '../controls/useLookback';
import { MIN_POINTS } from '../panel/minPoints';
import Panel from '../panel/Panel';
import { panelState } from '../panel/panelState';
import SkewHistoryChart from './SkewHistoryChart';

const CHART = 'skewHistory';

export default function SkewHistorySection() {
  const { window, resolution } = useLookback(CHART);
  const query = useVolHistory(useCurrency(), window, resolution);
  const state = panelState(query, query.data, query.data?.points.length ?? 0, MIN_POINTS.line);

  return (
    <Panel
      title="SKEW HISTORY"
      subtitle="25Δ RR / BF · CM 7D/30D × TIME"
      state={state}
      controls={
        <Scopes>
          <LookbackScope chartId={CHART} />
        </Scopes>
      }
    >
      {(data) => <SkewHistoryChart data={data} />}
    </Panel>
  );
}
