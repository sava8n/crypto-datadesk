import { useOIByStrike } from '../../api/queries';
import ExpirySelect from '../controls/ExpirySelect';
import Panel from '../panel/Panel';
import { MIN_POINTS } from '../panel/minPoints';
import { panelState } from '../panel/panelState';
import { useCurrency } from '../../settings/store';
import { useExpiryPicker } from '../controls/useExpiryPicker';
import OIByStrikeChart from './OIByStrikeChart';
import OIStatTiles from './OIStatTiles';

export default function OIByStrikeSection() {
  const currency = useCurrency();

  // the unfiltered call is what carries the expiry list; the selected slice is the
  // only one the backend gives max_pain and intrinsic value for
  const chain = useOIByStrike(currency);
  const { selected, select } = useExpiryPicker(chain.data?.expiries ?? [], { allowAll: true });

  const query = useOIByStrike(currency, selected || null);
  const state = panelState(query, query.data, query.data?.points.length ?? 0, MIN_POINTS.bars);

  return (
    <Panel
      title="OPEN INTEREST BY STRIKE"
      subtitle="CONTRACTS · ITM/OTM × STRIKE"
      state={state}
      controls={
        <ExpirySelect
          expiries={chain.data?.expiries ?? []}
          selected={selected}
          onSelect={select}
          allLabel="ALL EXPIRATIONS"
        />
      }
      footer={(data) => <OIStatTiles data={data} />}
    >
      {(data) => <OIByStrikeChart data={data} />}
    </Panel>
  );
}
