import { useOIByStrike } from '../../api/queries';
import { useCurrency } from '../../settings/store';
import { Scopes } from '../controls/Scope';
import { ExpiryScope, StrikeRangeScope } from '../controls/scopes';
import { useExpiry } from '../controls/useExpiry';
import { useStrikeWindowed } from '../controls/useStrikeWindow';
import { MIN_POINTS } from '../panel/minPoints';
import Panel from '../panel/Panel';
import { panelState } from '../panel/panelState';
import OIByStrikeChart from './OIByStrikeChart';
import OIStatTiles from './OIStatTiles';

const CHART = 'oiByStrike';

export default function OIByStrikeSection() {
  const currency = useCurrency();

  // the unfiltered call carries the expiry list; max_pain and intrinsic exist only for the
  // selected slice
  const chain = useOIByStrike(currency);
  const selected = useExpiry(CHART, chain.data?.expiries ?? [], { allowAll: true });

  const query = useOIByStrike(currency, selected || null);
  const spot = query.data?.spot ?? null;
  const { windowed, count } = useStrikeWindowed(CHART, query.data, spot);
  const state = panelState(query, windowed, count, MIN_POINTS.bars);

  return (
    <Panel
      title="OPEN INTEREST BY STRIKE"
      subtitle="CONTRACTS · ITM/OTM × STRIKE"
      state={state}
      controls={
        <Scopes>
          <ExpiryScope chartId={CHART} expiries={chain.data?.expiries ?? []} allowAll />
          <StrikeRangeScope chartId={CHART} />
        </Scopes>
      }
      // the tiles sum the whole slice, not the strike window
      footer={() => query.data && <OIStatTiles data={query.data} />}
    >
      {(data) => <OIByStrikeChart data={data} spot={spot} />}
    </Panel>
  );
}
