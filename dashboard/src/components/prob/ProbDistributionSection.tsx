import { useMemo } from 'react';

import { useProbCurves } from '../../api/queries';
import { useCurrency } from '../../settings/store';
import { expiriesOf } from '../../utils/expiry';
import { Scopes } from '../controls/Scope';
import { ExpiryScope } from '../controls/scopes';
import { useExpiry } from '../controls/useExpiry';
import { MIN_POINTS } from '../panel/minPoints';
import Panel from '../panel/Panel';
import { panelState } from '../panel/panelState';
import ProbDistributionChart from './ProbDistributionChart';

const CHART = 'probDistribution';

export default function ProbDistributionSection() {
  // same query key as the curves section
  const query = useProbCurves(useCurrency());

  const expiries = useMemo(() => expiriesOf(query.data?.points), [query.data]);

  const selected = useExpiry(CHART, expiries);

  const points = useMemo(
    () => (query.data && selected ? query.data.points.filter((p) => p.expiry === selected) : []),
    [query.data, selected],
  );

  const state = panelState(query, points, points.length, MIN_POINTS.family);
  const spot = query.data?.spot ?? 0;

  return (
    <Panel
      title="IMPLIED PROBABILITY DISTRIBUTION"
      subtitle={'STRIKE BUCKETS × P(K1<S≤K2) · PER EXPIRY'}
      state={state}
      controls={
        <Scopes>
          <ExpiryScope chartId={CHART} expiries={expiries} />
        </Scopes>
      }
    >
      {(data) => <ProbDistributionChart points={data} spot={spot} />}
    </Panel>
  );
}
