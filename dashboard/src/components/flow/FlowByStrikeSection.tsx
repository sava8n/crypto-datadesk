import { useFlowByStrike } from '../../api/queries';
import { useCurrency, useSettings } from '../../settings/store';
import { MIN_POINTS } from '../panel/minPoints';
import Panel from '../panel/Panel';
import { panelState } from '../panel/panelState';
import { coverageSuffix } from './coverage';
import FlowByStrikeChart from './FlowByStrikeChart';

export default function FlowByStrikeSection() {
  const { flowWindow } = useSettings();
  const query = useFlowByStrike(useCurrency(), flowWindow);
  const state = panelState(query, query.data, query.data?.points.length ?? 0, MIN_POINTS.bars);

  return (
    <Panel
      title="NET FLOW BY STRIKE"
      subtitle={`TAKER BUYS - SELLS · CONTRACTS × STRIKE${coverageSuffix(query.data)}`}
      state={state}
    >
      {(data) => <FlowByStrikeChart data={data} />}
    </Panel>
  );
}
