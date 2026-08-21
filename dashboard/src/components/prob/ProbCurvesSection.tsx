import { useProbCurves } from '../../api/queries';
import { useCurrency } from '../../settings/store';
import { Scopes } from '../controls/Scope';
import { DteScope } from '../controls/scopes';
import { useDteWindowed } from '../controls/useDteWindow';
import { MIN_POINTS } from '../panel/minPoints';
import Panel from '../panel/Panel';
import { panelState } from '../panel/panelState';
import ProbCurvesChart from './ProbCurvesChart';

const CHART = 'probCurves';

export default function ProbCurvesSection() {
  const query = useProbCurves(useCurrency());
  const { windowed, count } = useDteWindowed(CHART, query.data);
  const state = panelState(query, windowed, count, MIN_POINTS.family);

  return (
    <Panel
      title="IMPLIED PROBABILITIES"
      subtitle={'2D · STRIKE × P(S>K) · PER EXPIRY'}
      state={state}
      controls={
        <Scopes>
          <DteScope chartId={CHART} />
        </Scopes>
      }
    >
      {(data) => <ProbCurvesChart data={data} />}
    </Panel>
  );
}
