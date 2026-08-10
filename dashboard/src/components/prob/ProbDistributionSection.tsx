import { useMemo } from 'react';

import { useProbCurves } from '../../api/queries';
import Panel from '../panel/Panel';
import { MIN_POINTS } from '../panel/minPoints';
import { panelState } from '../panel/panelState';
import { useCurrency } from '../../settings/store';
import { useExpiry } from '../controls/useExpiry';
import { expiriesOf } from '../../utils/expiry';
import ProbDistributionChart from './ProbDistributionChart';

export default function ProbDistributionSection() {
  // same query key as the curves section, so the response is fetched once per currency
  const query = useProbCurves(useCurrency());

  const expiries = useMemo(() => expiriesOf(query.data?.points), [query.data]);

  const selected = useExpiry(expiries);

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
    >
      {(data) => <ProbDistributionChart points={data} spot={spot} />}
    </Panel>
  );
}
