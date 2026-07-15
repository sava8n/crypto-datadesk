import { useEffect, useState } from 'react';

import { CURRENCIES, type Settings } from '../../config';
import { useSettingsControl } from '../../settings/store';
import { COT_CATEGORIES, type CotCategoryKey } from '../../theme/charts';
import { FLOW_WEEKS } from '../cot/flow';
import { COT_METHODS } from '../cot/methods';
import { COT_WINDOWS } from '../cot/windows';
import { COT_ZOOMS } from '../cot/zoom';

interface FieldProps {
  label: string;
  hint?: string;
  value: number;
  step?: number;
  min?: number;
  onCommit: (v: number) => void;
}

// commits only parseable numbers, so a cleared or half-typed box never writes NaN
function NumberField({ label, hint, value, step, min, onCommit }: FieldProps) {
  const [text, setText] = useState(String(value));

  return (
    <label className="settings__row">
      <span className="settings__k">{label}</span>
      <input
        className="settings__input"
        type="number"
        step={step}
        min={min}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          const n = Number(e.target.value);
          if (e.target.value !== '' && Number.isFinite(n)) onCommit(n);
        }}
      />
      {hint && <span className="settings__hint">{hint}</span>}
    </label>
  );
}

export default function SettingsDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings, update, reset } = useSettingsControl();
  // remounts the fields after a reset, so their text state re-seeds from the defaults
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const setLevel = (patch: Partial<Settings['levels']>) =>
    update({ levels: { ...settings.levels, ...patch } });

  const setCot = (patch: Partial<Settings['cot']>) =>
    update({ cot: { ...settings.cot, ...patch } });

  const toggleParticipant = (key: CotCategoryKey) => {
    const on = settings.cot.participants.includes(key);
    if (on && settings.cot.participants.length === 1) return;
    const next = COT_CATEGORIES.map((c) => c.key).filter((k) =>
      k === key ? !on : settings.cot.participants.includes(k),
    );
    setCot({ participants: next });
  };

  return (
    <>
      {open && <div className="settings__scrim" onClick={onClose} />}

      <aside className={`settings${open ? ' settings--open' : ''}`} aria-hidden={!open}>
        <div className="settings__head">
          <span className="settings__title">SETTINGS</span>
          <button className="settings__close" onClick={onClose} aria-label="Close settings">
            ✕
          </button>
        </div>

        <div className="settings__body" key={nonce}>
          <div className="settings__group">
            <div className="settings__group-title">BOOK</div>
            <label className="settings__row">
              <span className="settings__k">CURRENCY</span>
              <select
                className="settings__select"
                value={settings.currency}
                onChange={(e) => update({ currency: e.target.value })}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="settings__group">
            <div className="settings__group-title">DTE WINDOW</div>
            <NumberField
              label="MIN DTE"
              value={settings.minDte}
              min={0}
              onCommit={(v) => update({ minDte: v })}
            />
            <NumberField
              label="MAX DTE"
              value={settings.maxDte}
              min={0}
              hint="resets the DTE box on every multi-expiry chart"
              onCommit={(v) => update({ maxDte: v })}
            />
          </div>

          <div className="settings__group">
            <div className="settings__group-title">EXPIRY</div>
            <label className="settings__row">
              <span className="settings__k">FRONT EXPIRY</span>
              <select
                className="settings__select"
                value={settings.frontExpiry}
                onChange={(e) =>
                  update({ frontExpiry: e.target.value as Settings['frontExpiry'] })
                }
              >
                <option value="weekly">WEEKLY</option>
                <option value="monthly">MONTHLY</option>
              </select>
            </label>
          </div>

          <div className="settings__group">
            <div className="settings__group-title">SPOT CHART</div>
            <NumberField
              label="LOOKBACK"
              value={settings.spotLookbackDays}
              min={1}
              hint="initial visible window, days of daily candles"
              onCommit={(v) => update({ spotLookbackDays: v })}
            />
          </div>

          <div className="settings__group">
            <div className="settings__group-title">CHART LEVELS</div>
            <NumberField
              label="RANGE"
              value={settings.levels.range}
              step={0.05}
              min={0}
              hint="levels beyond ±this of spot will not be drawn"
              onCommit={(v) => setLevel({ range: v })}
            />
            <NumberField
              label="TOLERANCE"
              value={settings.levels.tolerance}
              step={10}
              min={0}
              hint="coincident levels within this distance collapse, in units"
              onCommit={(v) => setLevel({ tolerance: v })}
            />
            <NumberField
              label="GEX MIN WEIGHT"
              value={settings.levels.gexClusterMinWeight}
              step={0.05}
              min={0}
              hint="cluster neighbor counts as stacked at >= this fraction of the max weight"
              onCommit={(v) => setLevel({ gexClusterMinWeight: v })}
            />
            <NumberField
              label="GEX MAX GAP"
              value={settings.levels.gexClusterMaxGap}
              step={0.1}
              min={0}
              hint="cluster max stacked-neighbor gap, in units of the median grid step"
              onCommit={(v) => setLevel({ gexClusterMaxGap: v })}
            />
          </div>

          <div className="settings__group">
            <div className="settings__group-title">COT REPORTS</div>
            <label className="settings__row">
              <span className="settings__k">INDEX WINDOW</span>
              <select
                className="settings__select"
                value={settings.cot.window}
                onChange={(e) =>
                  setCot({ window: Number(e.target.value) as Settings['cot']['window'] })
                }
              >
                {COT_WINDOWS.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="settings__row">
              <span className="settings__k">INDEX METHOD</span>
              <select
                className="settings__select"
                value={settings.cot.method}
                onChange={(e) =>
                  setCot({ method: e.target.value as Settings['cot']['method'] })
                }
              >
                {COT_METHODS.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="settings__row">
              <span className="settings__k">FLOW LOOKBACK</span>
              <select
                className="settings__select"
                value={settings.cot.flowWeeks}
                onChange={(e) => setCot({ flowWeeks: Number(e.target.value) })}
              >
                {FLOW_WEEKS.map((n) => (
                  <option key={n} value={n}>
                    {n}W
                  </option>
                ))}
              </select>
            </label>
            <label className="settings__row">
              <span className="settings__k">NET ZOOM</span>
              <select
                className="settings__select"
                value={settings.cot.netZoom}
                onChange={(e) =>
                  setCot({ netZoom: e.target.value as Settings['cot']['netZoom'] })
                }
              >
                {COT_ZOOMS.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <div className="settings__row">
              <span className="settings__k">PARTICIPANTS</span>
              <div className="settings__checks">
                {COT_CATEGORIES.map((cat) => (
                  <label key={cat.key} className="settings__check">
                    <input
                      type="checkbox"
                      checked={settings.cot.participants.includes(cat.key)}
                      onChange={() => toggleParticipant(cat.key)}
                    />
                    <span className="settings__chip" style={{ background: cat.color }} />
                    {cat.name}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="settings__foot">
          <button
            className="refresh"
            onClick={() => {
              reset();
              setNonce((n) => n + 1);
            }}
          >
            ⟲ RESET DEFAULTS
          </button>
        </div>
      </aside>
    </>
  );
}
