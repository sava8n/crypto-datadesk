import { useIVSurface } from '../../api/queries';
import DTEControl from '../controls/DTEControl';
import Panel from '../panel/Panel';
import { MIN_POINTS } from '../panel/minPoints';
import { panelState } from '../panel/panelState';
import { useCurrency } from '../../settings/store';
import { useDteWindowed } from '../controls/useDteWindow';
import IVSurfaceChart from './IVSurfaceChart';

export default function IVSurfaceSection() {
  const query = useIVSurface(useCurrency());
  const { windowed, count, dteProps } = useDteWindowed(query.data);
  const state = panelState(query, windowed, count, MIN_POINTS.family);

  return (
    <Panel
      title="IMPLIED VOLATILITY SURFACE"
      subtitle="3D · DELTA × EXPIRY × IV"
      state={state}
      controls={<DTEControl {...dteProps} />}
    >
      {(data) => <IVSurfaceChart data={data} />}
    </Panel>
  );
}
