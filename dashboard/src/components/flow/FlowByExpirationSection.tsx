import { useState } from 'react';

import { useFlowByExpiration } from '../../api/queries';
import type { OIChangeWindow } from '../../types';
import WindowSelect from '../controls/WindowSelect';
import Panel from '../panel/Panel';
import { MIN_POINTS } from '../panel/minPoints';
import { panelState } from '../panel/panelState';
import { useCurrency } from '../../settings/store';
import FlowByExpirationChart from './FlowByExpirationChart';

export default function FlowByExpirationSection() {
  const [window, setWindow] = useState<OIChangeWindow>('24h');
  const query = useFlowByExpiration(useCurrency(), window);
  const state = panelState(query, query.data, query.data?.points.length ?? 0, MIN_POINTS.bars);

  return (
    <Panel
      title="NET FLOW BY EXPIRATION"
      subtitle="TAKER BUYS − SELLS · CONTRACTS × EXPIRY"
      state={state}
      controls={<WindowSelect window={window} onSelect={setWindow} />}
    >
      {(data) => <FlowByExpirationChart data={data} />}
    </Panel>
  );
}
