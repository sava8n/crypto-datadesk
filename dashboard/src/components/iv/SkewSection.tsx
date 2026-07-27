import { useSkew } from '../../api/queries';
import DTEControl from '../controls/DTEControl';
import Panel from '../panel/Panel';
import { MIN_POINTS } from '../panel/minPoints';
import { panelState } from '../panel/panelState';
import { useCurrency } from '../../settings/store';
import { useDteWindowed } from '../controls/useDteWindow';
import SkewChart from './SkewChart';

export default function SkewSection() {
  const query = useSkew(useCurrency());
  const { windowed, count, dteProps } = useDteWindowed(query.data);
  const state = panelState(query, windowed, count, MIN_POINTS.series);

  return (
    <Panel
      title="25Δ SKEW"
      subtitle="2D · RR / BF × EXPIRY"
      state={state}
      controls={<DTEControl {...dteProps} />}
    >
      {(data) => <SkewChart data={data} />}
    </Panel>
  );
}
