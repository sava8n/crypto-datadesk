import { usePositioningHistory } from '../../api/queries';
import { useCurrency } from '../../settings/store';
import { Scopes } from '../controls/Scope';
import { LookbackScope } from '../controls/scopes';
import { useLookback } from '../controls/useLookback';
import { MIN_POINTS } from '../panel/minPoints';
import Panel from '../panel/Panel';
import { panelState } from '../panel/panelState';
import OIHistoryChart from './OIHistoryChart';

const CHART = 'oiHistory';

export default function OIHistorySection() {
  const { window, resolution } = useLookback(CHART);
  const query = usePositioningHistory(useCurrency(), window, resolution);
  const state = panelState(query, query.data, query.data?.points.length ?? 0, MIN_POINTS.line);

  return (
    <Panel
      title="OPEN INTEREST HISTORY"
      subtitle="CONTRACTS · CALLS/PUTS · P/C × TIME"
      state={state}
      controls={
        <Scopes>
          <LookbackScope chartId={CHART} />
        </Scopes>
      }
    >
      {(data) => <OIHistoryChart data={data} />}
    </Panel>
  );
}
