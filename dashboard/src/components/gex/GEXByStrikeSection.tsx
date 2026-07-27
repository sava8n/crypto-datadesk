import { useGEXByStrike } from '../../api/queries';
import Panel from '../panel/Panel';
import { MIN_POINTS } from '../panel/minPoints';
import { panelState } from '../panel/panelState';
import { useCurrency } from '../../settings/store';
import GEXByStrikeChart from './GEXByStrikeChart';

export default function GEXByStrikeSection() {
  const query = useGEXByStrike(useCurrency());
  const state = panelState(query, query.data, query.data?.points.length ?? 0, MIN_POINTS.bars);

  return (
    <Panel
      title="GAMMA EXPOSURE BY STRIKE"
      subtitle="USD / 1% MOVE · CALLS + / PUTS - × STRIKE"
      state={state}
    >
      {(data) => <GEXByStrikeChart data={data} />}
    </Panel>
  );
}
