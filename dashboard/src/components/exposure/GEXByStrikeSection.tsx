import { useExposureByStrike } from '../../api/queries';
import Panel from '../panel/Panel';
import { MIN_POINTS } from '../panel/minPoints';
import { panelState } from '../panel/panelState';
import { useCurrency, useSettings } from '../../settings/store';
import { conventionSubtitle } from './convention';
import ExposureByStrikeChart from './ExposureByStrikeChart';

export default function GEXByStrikeSection() {
  const { exposureConvention } = useSettings();
  const query = useExposureByStrike(useCurrency(), 'gamma', exposureConvention);
  const state = panelState(query, query.data, query.data?.points.length ?? 0, MIN_POINTS.bars);

  return (
    <Panel
      title="GAMMA EXPOSURE BY STRIKE"
      subtitle={conventionSubtitle('USD / 1% MOVE', query.data)}
      state={state}
    >
      {(data) => <ExposureByStrikeChart data={data} />}
    </Panel>
  );
}
