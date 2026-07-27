import { useTermStructure } from '../../api/queries';
import DTEControl from '../controls/DTEControl';
import Panel from '../panel/Panel';
import { MIN_POINTS } from '../panel/minPoints';
import { panelState } from '../panel/panelState';
import { useCurrency } from '../../settings/store';
import { useDteWindowed } from '../controls/useDteWindow';
import BasisChart from './BasisChart';

export default function BasisSection() {
  const query = useTermStructure(useCurrency());
  const { windowed, count, dteProps } = useDteWindowed(query.data);
  const state = panelState(query, windowed, count, MIN_POINTS.series);

  return (
    <Panel
      title="BASIS"
      subtitle="ANN. (F/S-1)/T × EXPIRY"
      state={state}
      controls={<DTEControl {...dteProps} />}
    >
      {(data) => <BasisChart data={data} />}
    </Panel>
  );
}
