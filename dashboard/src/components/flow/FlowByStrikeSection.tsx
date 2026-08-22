import { useFlowByStrike, useStats } from '../../api/queries';
import { useChartScope, useCurrency } from '../../settings/store';
import { Scopes } from '../controls/Scope';
import { FlowWindowScope, StrikeRangeScope } from '../controls/scopes';
import { useStrikeWindowed } from '../controls/useStrikeWindow';
import { MIN_POINTS } from '../panel/minPoints';
import Panel from '../panel/Panel';
import { panelState } from '../panel/panelState';
import { coverageSuffix } from './coverage';
import FlowByStrikeChart from './FlowByStrikeChart';

const CHART = 'flowByStrike';

export default function FlowByStrikeSection() {
  const currency = useCurrency();
  const { scope } = useChartScope(CHART);
  const query = useFlowByStrike(currency, scope.flowWindow);
  // the flow envelope carries no spot; the stats route serves the same index
  const spot = useStats(currency).data?.spot ?? null;
  const { windowed, count } = useStrikeWindowed(CHART, query.data, spot);
  const state = panelState(query, windowed, count, MIN_POINTS.bars);

  return (
    <Panel
      title="NET FLOW BY STRIKE"
      subtitle={`TAKER BUYS - SELLS · CONTRACTS × STRIKE${coverageSuffix(query.data)}`}
      state={state}
      controls={
        <Scopes>
          <FlowWindowScope chartId={CHART} />
          <StrikeRangeScope chartId={CHART} />
        </Scopes>
      }
    >
      {(data) => <FlowByStrikeChart data={data} spot={spot} />}
    </Panel>
  );
}
