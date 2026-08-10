import { useCMBands, useTermStructure } from '../../api/queries';
import Panel from '../panel/Panel';
import { MIN_POINTS } from '../panel/minPoints';
import { panelState } from '../panel/panelState';
import { useCurrency } from '../../settings/store';
import { useDteWindowed } from '../controls/useDteWindow';
import TermStructureChart from './TermStructureChart';

export default function TermStructureSection() {
  const currency = useCurrency();
  const query = useTermStructure(currency);
  // best-effort context: an unreachable archive just leaves the band off
  const bands = useCMBands(currency);
  const { windowed, count } = useDteWindowed(query.data);
  const state = panelState(query, windowed, count, MIN_POINTS.series);

  return (
    <Panel title="TERM STRUCTURE" subtitle="2D · ATM IV × EXPIRY · 90D BAND" state={state}>
      {(data) => <TermStructureChart data={data} bands={bands.data?.points} />}
    </Panel>
  );
}
