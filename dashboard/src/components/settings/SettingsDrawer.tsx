import { type ReactNode, useEffect, useState } from 'react';
import { useOIByStrike } from '../../api/queries';
import {
  ARCHIVE_WINDOWS,
  CONVENTIONS,
  CURRENCIES,
  type Currency,
  MAX_DTE_LIMIT,
  MIN_REFRESH_SECONDS,
  RECENT_WINDOWS,
  SPOT_LOOKBACKS,
} from '../../config';
import { useCurrency, useSettingsControl } from '../../settings/store';
import type { ArchiveWindow } from '../../types';
import { EXPIRY_ALL } from '../../utils/expiry';
import { dateLabel } from '../../utils/format';
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

interface RangeProps {
  label: string;
  hint?: string;
  min: number;
  max: number;
  onCommit: (min: number, max: number) => void;
}

// dual-thumb slider: two stacked native ranges, thumbs alone catch the pointer
function DteRangeField({ label, hint, min, max, onCommit }: RangeProps) {
  const lo = Math.min(min, MAX_DTE_LIMIT);
  const hi = Math.min(max, MAX_DTE_LIMIT);
  const pct = (v: number) => (v / MAX_DTE_LIMIT) * 100;

  return (
    <div className="settings__row settings__row--range">
      <span className="settings__k">{label}</span>
      <span className="settings__range-val">
        {lo} - {hi}D
      </span>
      <div className="range">
        <div className="range__rail" />
        <div
          className="range__fill"
          style={{ left: `${pct(lo)}%`, width: `${pct(hi) - pct(lo)}%` }}
        />
        <input
          type="range"
          min={0}
          max={MAX_DTE_LIMIT}
          value={lo}
          aria-label={`${label} minimum`}
          onChange={(e) => onCommit(Math.min(Number(e.target.value), hi), hi)}
        />
        <input
          type="range"
          min={0}
          max={MAX_DTE_LIMIT}
          value={hi}
          aria-label={`${label} maximum`}
          onChange={(e) => onCommit(lo, Math.max(Number(e.target.value), lo))}
        />
      </div>
      {hint && <span className="settings__hint">{hint}</span>}
    </div>
  );
}

const CURRENCY_OPTIONS = CURRENCIES.map((c) => ({ value: c, label: c }));
const LOOKBACK_OPTIONS = ARCHIVE_WINDOWS.map((w) => ({ value: w, label: w.toUpperCase() }));

export default function SettingsDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings, update, reset } = useSettingsControl();
  // NumberField holds its own text state, so a reset only reaches the boxes by remounting them
  const [resetCount, bumpResetCount] = useState(0);

  // the unfiltered chain carries the live expiry list for the picker; the drawer
  // is always mounted, so the query only runs while it is open
  const chain = useOIByStrike(useCurrency(), undefined, { enabled: open });
  const expiryOptions = [
    { value: 'weekly', label: 'AUTO WEEKLY' },
    { value: 'monthly', label: 'AUTO MONTHLY' },
    { value: EXPIRY_ALL, label: 'ALL EXPIRIES' },
    ...(chain.data?.expiries ?? []).map((iso) => ({ value: iso, label: dateLabel(iso) })),
  ];
  // a hand-typed lookback from an older blob still shows as the selected value
  const spotOptions = SPOT_LOOKBACKS.some((o) => o.value === settings.spotLookbackDays)
    ? SPOT_LOOKBACKS
    : [
        ...SPOT_LOOKBACKS,
        { value: settings.spotLookbackDays, label: `${settings.spotLookbackDays}D` },
      ];

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
      {/* a button, not a div: click-outside then also works from the keyboard */}
      {open && (
        <button
          type="button"
          className="settings__scrim"
          aria-label="Close settings"
          onClick={onClose}
        />
      )}

      <aside className={`settings${open ? ' settings--open' : ''}`} aria-hidden={!open}>
        <div className="settings__head">
          <span className="settings__title">SETTINGS</span>
          <button
            type="button"
            className="settings__close"
            onClick={onClose}
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>

        <div className="settings__body" key={resetCount}>
          <div className="settings__group">
            <div className="settings__group-title">GENERAL</div>
            <SelectField
              label="CURRENCY"
              value={settings.currency}
              options={CURRENCY_OPTIONS}
              onCommit={(v) => update({ currency: v as Currency })}
            />
            <NumberField
              label="REFRESH"
              value={settings.refreshSeconds}
              step={5}
              min={MIN_REFRESH_SECONDS}
              hint="seconds between polls; 10s is the service cache floor"
              onCommit={(v) => update({ refreshSeconds: v })}
            />
          </div>

          <div className="settings__group">
            <div className="settings__group-title">SCOPE</div>
            <SelectField
              label="EXPIRY"
              value={settings.expiry}
              options={expiryOptions}
              hint="drives the per-expiry charts, the expected-move cone and the header vol pair; a pick off the chain falls back to the front expiry"
              onCommit={(v) => update({ expiry: v })}
            />
            <DteRangeField
              label="DTE RANGE"
              min={settings.minDte}
              max={settings.maxDte}
              hint="windows the multi-expiry charts (curves, term structure, skew, basis)"
              onCommit={(min, max) => update({ minDte: min, maxDte: max })}
            />
          </div>

          <div className="settings__group">
            <div className="settings__group-title">CHARTS</div>
            <SelectField
              label="SPOT LOOKBACK"
              value={settings.spotLookbackDays}
              options={spotOptions}
              hint="market chart's initial visible window of daily candles"
              onCommit={(v) => update({ spotLookbackDays: v })}
            />
            <SelectField
              label="HISTORY LOOKBACK"
              value={settings.historyWindow}
              options={LOOKBACK_OPTIONS}
              hint="history panels; VRP stays pinned to 1Y"
              onCommit={(v) => update({ historyWindow: v as ArchiveWindow })}
            />
            <SelectField
              label="FLOW WINDOW"
              value={settings.flowWindow}
              options={RECENT_WINDOWS}
              hint="baseline for the flow, OI-change and smile-compare panels"
              onCommit={(v) => update({ flowWindow: v })}
            />
            <SelectField
              label="GEX SIGN"
              value={settings.exposureConvention}
              options={CONVENTIONS}
              onCommit={(v) => update({ exposureConvention: v })}
            />
            <SelectField
              label="TAPE MIN PREM"
              value={settings.tapeMinPremium}
              options={MIN_PREMIUMS}
              onCommit={(v) => update({ tapeMinPremium: v })}
            />
          </div>
        </div>

        <div className="settings__foot">
          <button
            type="button"
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
