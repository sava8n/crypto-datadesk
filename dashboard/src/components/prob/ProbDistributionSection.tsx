import { useMemo } from 'react';

import { useProbCurves } from '../../api/queries';
import ExpirySelect from '../controls/ExpirySelect';
import Panel from '../panel/Panel';
import { MIN_POINTS } from '../panel/minPoints';
import { panelState } from '../panel/panelState';
import { useCurrency } from '../../settings/store';
import { useExpiryPicker } from '../controls/useExpiryPicker';
import ProbDistributionChart from './ProbDistributionChart';

export default function ProbDistributionSection() {
  // same query key as the curves section, so the response is fetched once per currency
  const query = useProbCurves(useCurrency());

  // this response carries no expiry list of its own, unlike the greeks and OI chains
  const expiries = useMemo(() => {
    if (!query.data) return [];
    const tteByExpiry = new Map<string, number>();
    for (const p of query.data.points) {
      if (!tteByExpiry.has(p.expiry)) tteByExpiry.set(p.expiry, p.tte_years);
    }
    return [...tteByExpiry.entries()].sort((a, b) => a[1] - b[1]).map(([iso]) => iso);
  }, [query.data]);

  const { selected, select } = useExpiryPicker(expiries);

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
      controls={<ExpirySelect expiries={expiries} selected={selected} onSelect={select} />}
    >
      {(data) => <ProbDistributionChart points={data} spot={spot} />}
    </Panel>
  );
}
