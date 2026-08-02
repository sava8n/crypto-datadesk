import { useState } from 'react';

import { useFlowByStrike } from '../../api/queries';
import type { OIChangeWindow } from '../../types';
import WindowSelect from '../controls/WindowSelect';
import Panel from '../panel/Panel';
import { MIN_POINTS } from '../panel/minPoints';
import { panelState } from '../panel/panelState';
import { useCurrency } from '../../settings/store';
import FlowByStrikeChart from './FlowByStrikeChart';

export default function FlowByStrikeSection() {
  const [window, setWindow] = useState<OIChangeWindow>('24h');
  const query = useFlowByStrike(useCurrency(), window);
  const state = panelState(query, query.data, query.data?.points.length ?? 0, MIN_POINTS.bars);

  return (
    <Panel
      title="NET FLOW BY STRIKE"
      subtitle="TAKER BUYS − SELLS · CONTRACTS × STRIKE"
      state={state}
      controls={<WindowSelect window={window} onSelect={setWindow} />}
    >
      {(data) => <FlowByStrikeChart data={data} />}
    </Panel>
  );
}
