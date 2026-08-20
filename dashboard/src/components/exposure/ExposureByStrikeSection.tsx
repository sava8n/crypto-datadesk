import { useExposureByStrike } from '../../api/queries';
import { useChartScope, useCurrency } from '../../settings/store';
import type { ExposureGreek } from '../../types';
import { Scopes } from '../controls/Scope';
import { ConventionScope } from '../controls/scopes';
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
  const state = panelState(query, query.data, query.data?.points.length ?? 0, MIN_POINTS.bars);

  return (
    <Panel
      title={`${greek.toUpperCase()} EXPOSURE BY STRIKE`}
      subtitle={conventionSubtitle(UNITS[greek], query.data)}
      state={state}
      controls={
        <Scopes>
          <ConventionScope chartId={chartId} />
        </Scopes>
      }
    >
      {(data) => <ExposureByStrikeChart data={data} />}
    </Panel>
  );
}
