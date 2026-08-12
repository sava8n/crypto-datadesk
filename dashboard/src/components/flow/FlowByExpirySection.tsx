import { useFlowByExpiry } from '../../api/queries';
import { useCurrency, useSettings } from '../../settings/store';
import { MIN_POINTS } from '../panel/minPoints';
import Panel from '../panel/Panel';
import { panelState } from '../panel/panelState';
import { coverageSuffix } from './coverage';
import FlowByExpiryChart from './FlowByExpiryChart';

export default function FlowByExpirySection() {
  const { flowWindow } = useSettings();
  const query = useFlowByExpiry(useCurrency(), flowWindow);
  const state = panelState(query, query.data, query.data?.points.length ?? 0, MIN_POINTS.bars);

  return (
    <Panel
      title="NET FLOW BY EXPIRY"
      subtitle={`TAKER BUYS - SELLS · CONTRACTS × EXPIRY${coverageSuffix(query.data)}`}
      state={state}
    >
      {(data) => <FlowByExpiryChart data={data} />}
    </Panel>
  );
}
