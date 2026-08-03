import { useState } from 'react';

import { useGEXByStrike } from '../../api/queries';
import type { GexConvention } from '../../types';
import ConventionSelect from '../controls/ConventionSelect';
import Panel from '../panel/Panel';
import { MIN_POINTS } from '../panel/minPoints';
import { panelState } from '../panel/panelState';
import { useCurrency } from '../../settings/store';
import { conventionSubtitle } from './convention';
import GEXByStrikeChart from './GEXByStrikeChart';

export default function GEXByStrikeSection() {
  const [convention, setConvention] = useState<GexConvention>('assumption');
  const query = useGEXByStrike(useCurrency(), convention);
  const state = panelState(query, query.data, query.data?.points.length ?? 0, MIN_POINTS.bars);

  return (
    <Panel
      title="GAMMA EXPOSURE BY STRIKE"
      subtitle={conventionSubtitle('USD / 1% MOVE', query.data)}
      state={state}
      controls={<ConventionSelect convention={convention} onSelect={setConvention} />}
    >
      {(data) => <GEXByStrikeChart data={data} />}
    </Panel>
  );
}
