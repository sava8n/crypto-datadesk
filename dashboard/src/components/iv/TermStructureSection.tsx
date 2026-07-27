import { useTermStructure } from '../../api/queries';
import DTEControl from '../controls/DTEControl';
import Panel from '../panel/Panel';
import { MIN_POINTS } from '../panel/minPoints';
import { panelState } from '../panel/panelState';
import { useCurrency } from '../../settings/store';
import { useDteWindowed } from '../controls/useDteWindow';
import TermStructureChart from './TermStructureChart';

export default function TermStructureSection() {
  const query = useTermStructure(useCurrency());
  const { windowed, count, dteProps } = useDteWindowed(query.data);
  const state = panelState(query, windowed, count, MIN_POINTS.series);

  return (
    <Panel
      title="TERM STRUCTURE"
      subtitle="2D · ATM IV × EXPIRY"
      state={state}
      controls={<DTEControl {...dteProps} />}
    >
      {(data) => <TermStructureChart data={data} />}
    </Panel>
  );
}
