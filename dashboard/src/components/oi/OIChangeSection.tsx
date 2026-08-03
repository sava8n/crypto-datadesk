import { useOIChange } from '../../api/queries';
import ExpirySelect from '../controls/ExpirySelect';
import WindowSelect from '../controls/WindowSelect';
import { useSeeded } from '../controls/useSeeded';
import Panel from '../panel/Panel';
import { MIN_POINTS } from '../panel/minPoints';
import { panelState } from '../panel/panelState';
import { useCurrency, useSettings } from '../../settings/store';
import { useExpiryPicker } from '../controls/useExpiryPicker';
import { expiryLabel, timeLabel } from '../../utils/format';
import OIChangeChart from './OIChangeChart';

export default function OIChangeSection() {
  const currency = useCurrency();
  const [window, setWindow] = useSeeded(useSettings().flowWindow);

  const query = useOIChange(currency, window);
  const { selected, select } = useExpiryPicker(query.data?.expiries ?? [], { allowAll: true });
  const sliced = useOIChange(currency, window, selected || null);
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
            allLabel="ALL EXPIRATIONS"
          />
        </>
      }
      footer={(data) =>
        data.baseline_as_of != null && (
          <div className="oi-stats">
            <div className="oi-stat oi-stat--notional">
              <span className="oi-stat__label">Δ SINCE</span>
              <span className="oi-stat__value">
                {expiryLabel(data.baseline_as_of)} {timeLabel(data.baseline_as_of)}
                {data.baseline_stale && ' · STALE'}
              </span>
            </div>
          </div>
        )
      }
    >
      {(data) => <OIChangeChart data={data} />}
    </Panel>
  );
}
