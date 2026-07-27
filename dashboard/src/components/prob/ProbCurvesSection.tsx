import { useProbCurves } from '../../api/queries';
import DTEControl from '../controls/DTEControl';
import Panel from '../panel/Panel';
import { MIN_POINTS } from '../panel/minPoints';
import { panelState } from '../panel/panelState';
import { useCurrency } from '../../settings/store';
import { useDteWindowed } from '../controls/useDteWindow';
import ProbCurvesChart from './ProbCurvesChart';

export default function ProbCurvesSection() {
  const query = useProbCurves(useCurrency());
  const { windowed, count, dteProps } = useDteWindowed(query.data);
  const state = panelState(query, windowed, count, MIN_POINTS.family);

  return (
    <Panel
      title="IMPLIED PROBABILITIES"
      subtitle={'2D · STRIKE × P(S>K) · PER EXPIRY'}
      state={state}
      controls={<DTEControl {...dteProps} />}
    >
      {(data) => <ProbCurvesChart data={data} />}
    </Panel>
  );
}
