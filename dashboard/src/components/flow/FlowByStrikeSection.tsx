import { useFlowByStrike } from '../../api/queries';
import WindowSelect from '../controls/WindowSelect';
import { useSeeded } from '../controls/useSeeded';
import Panel from '../panel/Panel';
import { MIN_POINTS } from '../panel/minPoints';
import { panelState } from '../panel/panelState';
import { useCurrency, useSettings } from '../../settings/store';
import { coverageSuffix } from './coverage';
import FlowByStrikeChart from './FlowByStrikeChart';

export default function FlowByStrikeSection() {
  const [window, setWindow] = useSeeded(useSettings().flowWindow);
  const query = useFlowByStrike(useCurrency(), window);
  const state = panelState(query, query.data, query.data?.points.length ?? 0, MIN_POINTS.bars);

  return (
    <Panel
      title="NET FLOW BY STRIKE"
      subtitle={`TAKER BUYS - SELLS · CONTRACTS × STRIKE${coverageSuffix(query.data)}`}
      state={state}
      controls={<WindowSelect window={window} onSelect={setWindow} />}
    >
      {(data) => <FlowByStrikeChart data={data} />}
    </Panel>
  );
}
