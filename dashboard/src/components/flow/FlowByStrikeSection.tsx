import { useFlowByStrike } from '../../api/queries';
import { useChartScope, useCurrency } from '../../settings/store';
import { Scopes } from '../controls/Scope';
import { FlowWindowScope } from '../controls/scopes';
import { MIN_POINTS } from '../panel/minPoints';
import Panel from '../panel/Panel';
import { panelState } from '../panel/panelState';
import { coverageSuffix } from './coverage';
import FlowByStrikeChart from './FlowByStrikeChart';

const CHART = 'flowByStrike';

export default function FlowByStrikeSection() {
  const { scope } = useChartScope(CHART);
  const query = useFlowByStrike(useCurrency(), scope.flowWindow);
  const state = panelState(query, query.data, query.data?.points.length ?? 0, MIN_POINTS.bars);

  return (
    <Panel
      title="NET FLOW BY STRIKE"
      subtitle={`TAKER BUYS - SELLS · CONTRACTS × STRIKE${coverageSuffix(query.data)}`}
      state={state}
      controls={
        <Scopes>
          <FlowWindowScope chartId={CHART} />
        </Scopes>
      }
    >
      {(data) => <FlowByStrikeChart data={data} />}
    </Panel>
  );
}
