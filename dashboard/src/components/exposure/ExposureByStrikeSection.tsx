import { useState } from 'react';

import { useExposureByStrike } from '../../api/queries';
import { useCurrency, useSettings } from '../../settings/store';
import type { ExposureGreek } from '../../types';
import GreekSelect from '../controls/GreekSelect';
import { MIN_POINTS } from '../panel/minPoints';
import Panel from '../panel/Panel';
import { panelState } from '../panel/panelState';
import { conventionSubtitle } from './convention';
import ExposureByStrikeChart from './ExposureByStrikeChart';

export default function ExposureByStrikeSection() {
  const [greek, setGreek] = useState<ExposureGreek>('vanna');
  const { exposureConvention } = useSettings();
  const query = useExposureByStrike(useCurrency(), greek, exposureConvention);
  const state = panelState(query, query.data, query.data?.points.length ?? 0, MIN_POINTS.bars);

  return (
    <Panel
      title="VANNA / CHARM EXPOSURE BY STRIKE"
      subtitle={conventionSubtitle('USD Δ', query.data)}
      state={state}
      controls={<GreekSelect greek={greek} onSelect={setGreek} />}
    >
      {(data) => <ExposureByStrikeChart data={data} />}
    </Panel>
  );
}
