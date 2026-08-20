import { useCMBands, useSkew } from '../../api/queries';
import { useCurrency } from '../../settings/store';
import { Scopes } from '../controls/Scope';
import { DteScope } from '../controls/scopes';
import { useDteWindowed } from '../controls/useDteWindow';
import { MIN_POINTS } from '../panel/minPoints';
import Panel from '../panel/Panel';
import { panelState } from '../panel/panelState';
import SkewChart from './SkewChart';

const CHART = 'skew';

export default function SkewSection() {
  const currency = useCurrency();
  const query = useSkew(currency);
  // best-effort context: an unreachable archive just leaves the band off
  const bands = useCMBands(currency);
  const { windowed, count } = useDteWindowed(CHART, query.data);
  const state = panelState(query, windowed, count, MIN_POINTS.series);

  return (
    <Panel
      title="25Δ SKEW"
      subtitle="2D · RR / BF × EXPIRY · 90D RR BAND"
      state={state}
      controls={
        <Scopes>
          <DteScope chartId={CHART} />
        </Scopes>
      }
    >
      {(data) => <SkewChart data={data} bands={bands.data?.points} />}
    </Panel>
  );
}
