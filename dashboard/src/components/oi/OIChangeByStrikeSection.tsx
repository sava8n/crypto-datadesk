import { useOIChangeByStrike } from '../../api/queries';
import { useCurrency, useSettings } from '../../settings/store';
import { dateLabel, timeLabel } from '../../utils/format';
import { useExpiry } from '../controls/useExpiry';
import { MIN_POINTS } from '../panel/minPoints';
import Panel from '../panel/Panel';
import { panelState } from '../panel/panelState';
import OIChangeByStrikeChart from './OIChangeByStrikeChart';

export default function OIChangeByStrikeSection() {
  const currency = useCurrency();
  const { flowWindow } = useSettings();

  const query = useOIChangeByStrike(currency, flowWindow);
  const selected = useExpiry(query.data?.expiries ?? [], { allowAll: true });
  const sliced = useOIChangeByStrike(currency, flowWindow, selected || null);
  const state = panelState(sliced, sliced.data, sliced.data?.points.length ?? 0, MIN_POINTS.bars);

  return (
    <Panel
      title="OPEN INTEREST CHANGE"
      subtitle="ΔCONTRACTS · CALLS/PUTS × STRIKE"
      state={state}
      footer={(data) =>
        data.baseline_as_of != null && (
          <div className="oi-stats">
            <div className="oi-stat oi-stat--notional">
              <span className="oi-stat__label">Δ SINCE</span>
              <span className="oi-stat__value">
                {dateLabel(data.baseline_as_of)} {timeLabel(data.baseline_as_of)}
                {data.baseline_stale && ' · STALE'}
              </span>
            </div>
          </div>
        )
      }
    >
      {(data) => <OIChangeByStrikeChart data={data} />}
    </Panel>
  );
}
