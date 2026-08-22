import { useExposureByStrike } from '../../api/queries';
import { useChartScope, useCurrency } from '../../settings/store';
import type { ExposureGreek } from '../../types';
import { Scopes } from '../controls/Scope';
import { ConventionScope, StrikeRangeScope } from '../controls/scopes';
import { useStrikeWindowed } from '../controls/useStrikeWindow';
import { MIN_POINTS } from '../panel/minPoints';
import Panel from '../panel/Panel';
import { panelState } from '../panel/panelState';
import { conventionSubtitle } from './convention';
import ExposureByStrikeChart from './ExposureByStrikeChart';

const UNITS: Record<ExposureGreek, string> = {
  gamma: 'USD / 1% MOVE',
  vanna: 'USD Δ / VOL PT',
  charm: 'USD Δ / DAY',
};

export default function ExposureByStrikeSection({ greek }: { greek: ExposureGreek }) {
  const chartId = `${greek}Exposure`;
  const { scope } = useChartScope(chartId);
  const query = useExposureByStrike(useCurrency(), greek, scope.exposureConvention);
  const spot = query.data?.spot ?? null;
  const { windowed, count } = useStrikeWindowed(chartId, query.data, spot);
  const state = panelState(query, windowed, count, MIN_POINTS.bars);

  return (
    <Panel
      title={`${greek.toUpperCase()} EXPOSURE BY STRIKE`}
      subtitle={conventionSubtitle(UNITS[greek], query.data)}
      state={state}
      controls={
        <Scopes>
          <ConventionScope chartId={chartId} />
          <StrikeRangeScope chartId={chartId} />
        </Scopes>
      }
    >
      {(data) => <ExposureByStrikeChart data={data} spot={spot} />}
    </Panel>
  );
}
