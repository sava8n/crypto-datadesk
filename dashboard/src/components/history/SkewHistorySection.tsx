import { useVolHistory } from '../../api/queries';
import { HISTORY_RESOLUTION, HISTORY_WINDOW } from '../../config';
import { useCurrency } from '../../settings/store';
import { MIN_POINTS } from '../panel/minPoints';
import Panel from '../panel/Panel';
import { panelState } from '../panel/panelState';
import SkewHistoryChart from './SkewHistoryChart';

export default function SkewHistorySection() {
  const query = useVolHistory(useCurrency(), HISTORY_WINDOW, HISTORY_RESOLUTION);
  const state = panelState(query, query.data, query.data?.points.length ?? 0, MIN_POINTS.line);

  return (
    <Panel title="SKEW HISTORY" subtitle="25Δ RR / BF · CM 7D/30D × TIME" state={state}>
      {(data) => <SkewHistoryChart data={data} />}
    </Panel>
  );
}
