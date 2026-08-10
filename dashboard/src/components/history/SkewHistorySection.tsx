import { useVolHistory } from '../../api/queries';
import Panel from '../panel/Panel';
import { MIN_POINTS } from '../panel/minPoints';
import { panelState } from '../panel/panelState';
import { useCurrency } from '../../settings/store';
import { useLookback } from '../controls/useLookback';
import SkewHistoryChart from './SkewHistoryChart';

export default function SkewHistorySection() {
  const { window, resolution } = useLookback();
  const query = useVolHistory(useCurrency(), window, resolution);
  const state = panelState(query, query.data, query.data?.points.length ?? 0, MIN_POINTS.line);

  return (
    <Panel title="SKEW HISTORY" subtitle="25Δ RR / BF · CM 7D/30D × TIME" state={state}>
      {(data) => <SkewHistoryChart data={data} />}
    </Panel>
  );
}
