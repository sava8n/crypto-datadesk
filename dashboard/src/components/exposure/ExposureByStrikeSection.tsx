import { useState } from 'react';

import { useExposureByStrike } from '../../api/queries';
import type { ExposureGreek } from '../../types';
import ConventionSelect from '../controls/ConventionSelect';
import GreekSelect from '../controls/GreekSelect';
import { useSeeded } from '../controls/useSeeded';
import Panel from '../panel/Panel';
import { MIN_POINTS } from '../panel/minPoints';
import { panelState } from '../panel/panelState';
import { useCurrency, useSettings } from '../../settings/store';
import { conventionSubtitle } from './convention';
import ExposureByStrikeChart from './ExposureByStrikeChart';

export default function ExposureByStrikeSection() {
  const [greek, setGreek] = useState<ExposureGreek>('vanna');
  const [convention, setConvention] = useSeeded(useSettings().exposureConvention);
  const query = useExposureByStrike(useCurrency(), greek, convention);
  const state = panelState(query, query.data, query.data?.points.length ?? 0, MIN_POINTS.bars);

  return (
    <Panel
      title="VANNA / CHARM EXPOSURE BY STRIKE"
      subtitle={conventionSubtitle('USD Δ', query.data)}
      state={state}
      controls={
        <>
          <GreekSelect greek={greek} onSelect={setGreek} />
          <ConventionSelect convention={convention} onSelect={setConvention} />
        </>
      }
    >
      {(data) => <ExposureByStrikeChart data={data} />}
    </Panel>
  );
}
