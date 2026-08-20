import { useFlowByExpiry } from '../../api/queries';
import { useChartScope, useCurrency } from '../../settings/store';
import { Scopes } from '../controls/Scope';
import { FlowWindowScope } from '../controls/scopes';
import { MIN_POINTS } from '../panel/minPoints';
import Panel from '../panel/Panel';
import { panelState } from '../panel/panelState';
import { coverageSuffix } from './coverage';
import FlowByExpiryChart from './FlowByExpiryChart';

const CHART = 'flowByExpiry';

export default function FlowByExpirySection() {
  const { scope } = useChartScope(CHART);
  const query = useFlowByExpiry(useCurrency(), scope.flowWindow);
  const state = panelState(query, query.data, query.data?.points.length ?? 0, MIN_POINTS.bars);

  return (
    <Panel
      title="NET FLOW BY EXPIRY"
      subtitle={`TAKER BUYS - SELLS · CONTRACTS × EXPIRY${coverageSuffix(query.data)}`}
      state={state}
      controls={
        <Scopes>
          <FlowWindowScope chartId={CHART} />
        </Scopes>
      }
    >
      {(data) => <FlowByExpiryChart data={data} />}
    </Panel>
  );
}
