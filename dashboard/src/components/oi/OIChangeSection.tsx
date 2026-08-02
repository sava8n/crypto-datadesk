import { useState } from 'react';

import { useOIChange } from '../../api/queries';
import type { OIChangeWindow } from '../../types';
import ExpirySelect from '../controls/ExpirySelect';
import Panel from '../panel/Panel';
import { MIN_POINTS } from '../panel/minPoints';
import { panelState } from '../panel/panelState';
import { useCurrency } from '../../settings/store';
import { useExpiryPicker } from '../controls/useExpiryPicker';
import { expiryLabel, timeLabel } from '../../utils/format';
import OIChangeChart from './OIChangeChart';

const WINDOWS: { value: OIChangeWindow; label: string }[] = [
  { value: '24h', label: '24H' },
  { value: '7d', label: '7D' },
];

function WindowSelect({
  window,
  onSelect,
}: {
  window: OIChangeWindow;
  onSelect: (w: OIChangeWindow) => void;
}) {
  return (
    <label className="expiry">
      <span className="expiry__label">WINDOW</span>
      <select
        className="expiry__select"
        value={window}
        onChange={(e) => onSelect(e.target.value as OIChangeWindow)}
      >
        {WINDOWS.map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function OIChangeSection() {
  const currency = useCurrency();
  const [window, setWindow] = useState<OIChangeWindow>('24h');

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
