import { useOIChangeByStrike } from '../../api/queries';
import ExpirySelect from '../controls/ExpirySelect';
import WindowSelect from '../controls/WindowSelect';
import { useSeeded } from '../controls/useSeeded';
import Panel from '../panel/Panel';
import { MIN_POINTS } from '../panel/minPoints';
import { panelState } from '../panel/panelState';
import { useCurrency, useSettings } from '../../settings/store';
import { useExpiryPicker } from '../controls/useExpiryPicker';
import { dateLabel, timeLabel } from '../../utils/format';
import OIChangeByStrikeChart from './OIChangeByStrikeChart';

export default function OIChangeByStrikeSection() {
  const currency = useCurrency();
  const [window, setWindow] = useSeeded(useSettings().flowWindow);

  const query = useOIChangeByStrike(currency, window);
  const { selected, select } = useExpiryPicker(query.data?.expiries ?? [], { allowAll: true });
  const sliced = useOIChangeByStrike(currency, window, selected || null);
  const state = panelState(sliced, sliced.data, sliced.data?.points.length ?? 0, MIN_POINTS.bars);

  return (
    <Panel
      title="OPEN INTEREST CHANGE"
      subtitle="ΔCONTRACTS · CALLS/PUTS × STRIKE"
      state={state}
      controls={
        <>
          <WindowSelect window={window} onSelect={setWindow} />
          <ExpirySelect
            expiries={query.data?.expiries ?? []}
            selected={selected}
            onSelect={select}
            allLabel="ALL EXPIRIES"
          />
        </>
      }
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
