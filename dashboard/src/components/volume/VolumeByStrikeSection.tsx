import { useVolumeByStrike } from '../../api/queries';
import { useCurrency } from '../../settings/store';
import { Scopes } from '../controls/Scope';
import { StrikeRangeScope } from '../controls/scopes';
import { useStrikeWindowed } from '../controls/useStrikeWindow';
import { MIN_POINTS } from '../panel/minPoints';
import Panel from '../panel/Panel';
import { panelState } from '../panel/panelState';
import VolumeByStrikeChart from './VolumeByStrikeChart';

const CHART = 'volumeByStrike';

export default function VolumeByStrikeSection() {
  const query = useVolumeByStrike(useCurrency());
  const spot = query.data?.spot ?? null;
  const { windowed, count } = useStrikeWindowed(CHART, query.data, spot);
  const state = panelState(query, windowed, count, MIN_POINTS.bars);

  return (
    <Panel
      title="VOLUME BY STRIKE"
      subtitle="CONTRACTS · 24H · CALLS/PUTS × STRIKE"
      state={state}
      controls={
        <Scopes>
          <StrikeRangeScope chartId={CHART} />
        </Scopes>
      }
    >
      {(data) => <VolumeByStrikeChart data={data} spot={spot} />}
    </Panel>
  );
}
