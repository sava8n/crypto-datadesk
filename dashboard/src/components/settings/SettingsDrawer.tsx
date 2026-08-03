import { useEffect, useState, type ReactNode } from 'react';

import {
  CURRENCIES,
  LOOKBACKS,
  MIN_REFRESH_SECONDS,
  type Currency,
  type LookbackDays,
  type Settings,
} from '../../config';
import { useSettingsControl } from '../../settings/store';
import { CONVENTIONS } from '../controls/ConventionSelect';
import { WINDOWS } from '../controls/WindowSelect';
import { MIN_PREMIUMS } from '../flow/tape';

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

interface SelectProps<T extends string | number> {
  label: string;
  hint?: string;
  value: T;
  options: readonly { value: T; label: ReactNode }[];
  onCommit: (v: T) => void;
}

// the option lists come from the inline controls themselves, so the drawer default
// and the panel dropdown can never offer different choices
function SelectField<T extends string | number>({
  label,
  hint,
  value,
  options,
  onCommit,
}: SelectProps<T>) {
  return (
    <label className="settings__row">
      <span className="settings__k">{label}</span>
      <select
        className="settings__select"
        value={value}
        onChange={(e) => {
          const picked = options.find((o) => String(o.value) === e.target.value);
          if (picked) onCommit(picked.value);
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && <span className="settings__hint">{hint}</span>}
    </label>
  );
}

const CURRENCY_OPTIONS = CURRENCIES.map((c) => ({ value: c, label: c }));
const FRONT_EXPIRY_OPTIONS = [
  { value: 'weekly' as const, label: 'WEEKLY' },
  { value: 'monthly' as const, label: 'MONTHLY' },
];
const LOOKBACK_OPTIONS = LOOKBACKS.map((d) => ({
  value: d,
  label: d === 365 ? '1Y' : `${d}D`,
}));

export default function SettingsDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings, update, reset } = useSettingsControl();
  // NumberField holds its own text state, so a reset only reaches the boxes by remounting them
  const [resetCount, bumpResetCount] = useState(0);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <>
      {open && <div className="settings__scrim" onClick={onClose} />}

      <aside className={`settings${open ? ' settings--open' : ''}`} aria-hidden={!open}>
        <div className="settings__head">
          <span className="settings__title">SETTINGS</span>
          <button type="button" className="settings__close" onClick={onClose} aria-label="Close settings">
            ✕
          </button>
        </div>

        <div className="settings__body" key={resetCount}>
          <div className="settings__group">
            <div className="settings__group-title">BOOK</div>
            <SelectField
              label="CURRENCY"
              value={settings.currency}
              options={CURRENCY_OPTIONS}
              onCommit={(v) => update({ currency: v as Currency })}
            />
          </div>

          <div className="settings__group">
            <div className="settings__group-title">MARKET CHART</div>
            <NumberField
              label="LOOKBACK"
              value={settings.spotLookbackDays}
              min={1}
              hint="initial visible window, days of daily candles"
              onCommit={(v) => update({ spotLookbackDays: v })}
            />
          </div>

          <div className="settings__group">
            <div className="settings__group-title">EXPIRY &amp; DTE</div>
            <SelectField
              label="FRONT EXPIRY"
              value={settings.frontExpiry}
              options={FRONT_EXPIRY_OPTIONS}
              hint="anchors the expected-move cone and the header's IV/RV pair"
              onCommit={(v) => update({ frontExpiry: v as Settings['frontExpiry'] })}
            />
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
            <div className="settings__group-title">CHART DEFAULTS</div>
            <SelectField
              label="HISTORY LOOKBACK"
              value={settings.historyLookbackDays}
              options={LOOKBACK_OPTIONS}
              onCommit={(v) => update({ historyLookbackDays: v as LookbackDays })}
            />
            <SelectField
              label="GEX SIGN"
              value={settings.gexConvention}
              options={CONVENTIONS}
              onCommit={(v) => update({ gexConvention: v })}
            />
            <SelectField
              label="FLOW WINDOW"
              value={settings.flowWindow}
              options={WINDOWS}
              onCommit={(v) => update({ flowWindow: v })}
            />
            <SelectField
              label="TAPE MIN PREM"
              value={settings.tapeMinPremium}
              options={MIN_PREMIUMS}
              hint="each panel keeps its own override until one of these moves"
              onCommit={(v) => update({ tapeMinPremium: v })}
            />
          </div>

          <div className="settings__group">
            <div className="settings__group-title">DATA</div>
            <NumberField
              label="REFRESH"
              value={settings.refreshSeconds}
              step={5}
              min={MIN_REFRESH_SECONDS}
              hint="seconds between polls; 10s is the service cache floor"
              onCommit={(v) => update({ refreshSeconds: v })}
            />
          </div>
        </div>

        <div className="settings__foot">
          <button
            className="refresh"
            onClick={() => {
              reset();
              bumpResetCount((n) => n + 1);
            }}
          >
            ⟲ RESET DEFAULTS
          </button>
        </div>
      </aside>
    </>
  );
}
