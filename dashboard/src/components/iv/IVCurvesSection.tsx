import { useIVCurves } from '../../api/queries';
import { useCurrency } from '../../settings/store';
import { useDteWindowed } from '../controls/useDteWindow';
import { MIN_POINTS } from '../panel/minPoints';
import Panel from '../panel/Panel';
import { panelState } from '../panel/panelState';
import IVCurvesChart from './IVCurvesChart';

export default function IVCurvesSection() {
  const query = useIVCurves(useCurrency());
  const { windowed, count } = useDteWindowed(query.data);
  const state = panelState(query, windowed, count, MIN_POINTS.family);

  return (
    <Panel title="IMPLIED VOLATILITY CURVES" subtitle="2D · STRIKE × IV · PER EXPIRY" state={state}>
      {(data) => <IVCurvesChart data={data} />}
    </Panel>
  );
}
