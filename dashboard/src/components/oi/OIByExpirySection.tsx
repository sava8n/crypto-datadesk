import { useOIByExpiry } from '../../api/queries';
import Panel from '../panel/Panel';
import { MIN_POINTS } from '../panel/minPoints';
import { panelState } from '../panel/panelState';
import { useCurrency } from '../../settings/store';
import OIByExpiryChart from './OIByExpiryChart';

export default function OIByExpirySection() {
  const query = useOIByExpiry(useCurrency());
  const state = panelState(query, query.data, query.data?.points.length ?? 0, MIN_POINTS.bars);

  return (
    <Panel
      title="OPEN INTEREST BY EXPIRY"
      subtitle="CONTRACTS · ITM/OTM × EXPIRY"
      state={state}
    >
      {(data) => <OIByExpiryChart data={data} />}
    </Panel>
  );
}
