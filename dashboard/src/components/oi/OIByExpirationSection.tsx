import { useOIByExpiration } from '../../api/queries';
import Panel from '../panel/Panel';
import { MIN_POINTS } from '../panel/minPoints';
import { panelState } from '../panel/panelState';
import { useCurrency } from '../../settings/store';
import OIByExpirationChart from './OIByExpirationChart';

export default function OIByExpirationSection() {
  const query = useOIByExpiration(useCurrency());
  const state = panelState(query, query.data, query.data?.points.length ?? 0, MIN_POINTS.bars);

  return (
    <Panel title="OPEN INTEREST BY EXPIRATION" subtitle="CONTRACTS · ITM/OTM × EXPIRY" state={state}>
      {(data) => <OIByExpirationChart data={data} />}
    </Panel>
  );
}
