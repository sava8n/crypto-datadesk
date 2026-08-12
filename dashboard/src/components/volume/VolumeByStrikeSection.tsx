import { useVolumeByStrike } from '../../api/queries';
import { useCurrency } from '../../settings/store';
import { MIN_POINTS } from '../panel/minPoints';
import Panel from '../panel/Panel';
import { panelState } from '../panel/panelState';
import VolumeByStrikeChart from './VolumeByStrikeChart';

export default function VolumeByStrikeSection() {
  const query = useVolumeByStrike(useCurrency());
  const state = panelState(query, query.data, query.data?.points.length ?? 0, MIN_POINTS.bars);

  return (
    <Panel title="VOLUME BY STRIKE" subtitle="CONTRACTS · 24H · CALLS/PUTS × STRIKE" state={state}>
      {(data) => <VolumeByStrikeChart data={data} />}
    </Panel>
  );
}
