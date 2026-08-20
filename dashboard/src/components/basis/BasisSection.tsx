import { useTermStructure } from '../../api/queries';
import { useCurrency } from '../../settings/store';
import { Scopes } from '../controls/Scope';
import { DteScope } from '../controls/scopes';
import { useDteWindowed } from '../controls/useDteWindow';
import { MIN_POINTS } from '../panel/minPoints';
import Panel from '../panel/Panel';
import { panelState } from '../panel/panelState';
import BasisChart from './BasisChart';

const CHART = 'basis';

export default function BasisSection() {
  const query = useTermStructure(useCurrency());
  const { windowed, count } = useDteWindowed(CHART, query.data);
  const state = panelState(query, windowed, count, MIN_POINTS.series);

  return (
    <Panel
      title="BASIS"
      subtitle="ANN. (F/S-1)/T × EXPIRY"
      state={state}
      controls={
        <Scopes>
          <DteScope chartId={CHART} />
        </Scopes>
      }
    >
      {(data) => <BasisChart data={data} />}
    </Panel>
  );
}
