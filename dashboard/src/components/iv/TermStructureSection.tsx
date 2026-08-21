import { useCMBands, useTermStructure } from '../../api/queries';
import { useCurrency } from '../../settings/store';
import { Scopes } from '../controls/Scope';
import { DteScope } from '../controls/scopes';
import { useDteWindowed } from '../controls/useDteWindow';
import { MIN_POINTS } from '../panel/minPoints';
import Panel from '../panel/Panel';
import { panelState } from '../panel/panelState';
import TermStructureChart from './TermStructureChart';

const CHART = 'termStructure';

export default function TermStructureSection() {
  const currency = useCurrency();
  const query = useTermStructure(currency);
  // best-effort: an unreachable archive leaves the band off
  const bands = useCMBands(currency);
  const { windowed, count } = useDteWindowed(CHART, query.data);
  const state = panelState(query, windowed, count, MIN_POINTS.series);

  return (
    <Panel
      title="TERM STRUCTURE"
      subtitle="2D · ATM IV × EXPIRY · 90D BAND"
      state={state}
      controls={
        <Scopes>
          <DteScope chartId={CHART} />
        </Scopes>
      }
    >
      {(data) => <TermStructureChart data={data} bands={bands.data?.points} />}
    </Panel>
  );
}
