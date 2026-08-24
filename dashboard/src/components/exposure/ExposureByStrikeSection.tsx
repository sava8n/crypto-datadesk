import { useExposureByStrike } from '../../api/queries';
import { useCurrency } from '../../settings/store';
import type { ExposureGreek } from '../../types';
import { Scopes } from '../controls/Scope';
import { StrikeRangeScope } from '../controls/scopes';
import { useStrikeWindowed } from '../controls/useStrikeWindow';
import { MIN_POINTS } from '../panel/minPoints';
import Panel from '../panel/Panel';
import { panelState } from '../panel/panelState';
import { coverageSubtitle } from './coverage';
import ExposureByStrikeChart from './ExposureByStrikeChart';

const UNITS: Record<ExposureGreek, string> = {
  gamma: 'USD / 1% MOVE',
  vanna: 'USD Δ / VOL PT',
  charm: 'USD Δ / DAY',
};

export default function ExposureByStrikeSection({ greek }: { greek: ExposureGreek }) {
  const chartId = `${greek}Exposure`;
  const query = useExposureByStrike(useCurrency(), greek);
  const spot = query.data?.spot ?? null;
  const { windowed, count } = useStrikeWindowed(chartId, query.data, spot);
  const state = panelState(query, windowed, count, MIN_POINTS.bars);

  return (
    <Panel
      title={`${greek.toUpperCase()} EXPOSURE BY STRIKE`}
      subtitle={coverageSubtitle(UNITS[greek], query.data)}
      state={state}
      controls={
        <Scopes>
          <StrikeRangeScope chartId={chartId} />
        </Scopes>
      }
    >
      {(data) => <ExposureByStrikeChart data={data} spot={spot} />}
    </Panel>
  );
}
