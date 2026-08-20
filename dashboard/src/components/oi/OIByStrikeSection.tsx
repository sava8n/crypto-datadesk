import { useOIByStrike } from '../../api/queries';
import { useCurrency } from '../../settings/store';
import { Scopes } from '../controls/Scope';
import { ExpiryScope } from '../controls/scopes';
import { useExpiry } from '../controls/useExpiry';
import { MIN_POINTS } from '../panel/minPoints';
import Panel from '../panel/Panel';
import { panelState } from '../panel/panelState';
import OIByStrikeChart from './OIByStrikeChart';
import OIStatTiles from './OIStatTiles';

const CHART = 'oiByStrike';

export default function OIByStrikeSection() {
  const currency = useCurrency();

  // the unfiltered call is what carries the expiry list; the selected slice is the
  // only one the backend gives max_pain and intrinsic value for
  const chain = useOIByStrike(currency);
  const selected = useExpiry(CHART, chain.data?.expiries ?? [], { allowAll: true });

  const query = useOIByStrike(currency, selected || null);
  const state = panelState(query, query.data, query.data?.points.length ?? 0, MIN_POINTS.bars);

  return (
    <Panel
      title="OPEN INTEREST BY STRIKE"
      subtitle="CONTRACTS · ITM/OTM × STRIKE"
      state={state}
      controls={
        <Scopes>
          <ExpiryScope chartId={CHART} expiries={chain.data?.expiries ?? []} allowAll />
        </Scopes>
      }
      footer={(data) => <OIStatTiles data={data} />}
    >
      {(data) => <OIByStrikeChart data={data} />}
    </Panel>
  );
}
