import { useCMBands, useSkew } from '../../api/queries';
import DTEControl from '../controls/DTEControl';
import Panel from '../panel/Panel';
import { MIN_POINTS } from '../panel/minPoints';
import { panelState } from '../panel/panelState';
import { useCurrency } from '../../settings/store';
import { useDteWindowed } from '../controls/useDteWindow';
import SkewChart from './SkewChart';

export default function SkewSection() {
  const currency = useCurrency();
  const query = useSkew(currency);
  // best-effort context: an unreachable archive just leaves the band off
  const bands = useCMBands(currency);
  const { windowed, count, dteProps } = useDteWindowed(query.data);
  const state = panelState(query, windowed, count, MIN_POINTS.series);

  return (
    <Panel
      title="25Δ SKEW"
      subtitle="2D · RR / BF × EXPIRY · 90D RR BAND"
      state={state}
      controls={<DTEControl {...dteProps} />}
    >
      {(data) => <SkewChart data={data} bands={bands.data?.points} />}
    </Panel>
  );
}
