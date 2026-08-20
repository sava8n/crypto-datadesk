import { type ReactNode, useEffect } from 'react';

import { CURRENCIES, MIN_REFRESH_SECONDS } from '../../config';
import { useSettingsControl } from '../../settings/store';
import type { ThemeMode } from '../../theme/mode';
import type { FrontExpiry } from '../../utils/expiry';

interface RowProps {
  label: string;
  hint: string;
  children: ReactNode;
}

function Row({ label, hint, children }: RowProps) {
  return (
    <div className="prefs__row">
      <div className="prefs__text">
        <span className="prefs__label">{label}</span>
        <span className="prefs__hint">{hint}</span>
      </div>
      {children}
    </div>
  );
}

interface PickProps<T extends string | number> {
  value: T;
  options: readonly { value: T; label: string }[];
  onSelect: (v: T) => void;
  label: string;
}

/** A chromeless select wearing the value pill as its box. */
function Pick<T extends string | number>({ value, options, onSelect, label }: PickProps<T>) {
  return (
    <div className="prefs__pill">
      <select
        aria-label={label}
        value={value}
        onChange={(e) => {
          const picked = options.find((o) => String(o.value) === e.target.value);
          if (picked) onSelect(picked.value);
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

const CURRENCY_OPTIONS = CURRENCIES.map((c) => ({ value: c, label: c }));

const REFRESH_OPTIONS = [10, 30, 60, 120, 300].map((s) => ({ value: s, label: `${s}s` }));

const TENOR_OPTIONS: { value: FrontExpiry; label: string }[] = [
  { value: 'weekly', label: 'WEEKLY' },
  { value: 'monthly', label: 'MONTHLY' },
];

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'LIGHT' },
  { value: 'dark', label: 'DARK' },
];

export default function PreferencesModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { settings, update } = useSettingsControl();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal">
      <button
        type="button"
        className="modal__scrim"
        aria-label="Close preferences"
        onClick={onClose}
      />
      <div className="modal__dialog" role="dialog" aria-modal="true" aria-label="Preferences">
        <div className="modal__head">
          <div className="prefs__text">
            <span className="modal__title">Preferences</span>
            <span className="modal__sub">Set once · saved locally</span>
          </div>
          <button type="button" className="keycap" onClick={onClose}>
            ESC
          </button>
        </div>

        <div className="modal__body">
          <Row label="Currency" hint="Only BTC is quoted on Deribit options today.">
            <Pick
              label="Currency"
              value={settings.currency}
              options={CURRENCY_OPTIONS}
              onSelect={(v) => update({ currency: v })}
            />
          </Row>

          <Row label="Theme" hint="Light for the desk, dark for the screen.">
            <Pick
              label="Theme"
              value={settings.theme}
              options={THEME_OPTIONS}
              onSelect={(v) => update({ theme: v })}
            />
          </Row>

          <Row
            label="Refresh interval"
            hint={`Seconds between polls; ${MIN_REFRESH_SECONDS}s is the service cache floor.`}
          >
            <Pick
              label="Refresh interval"
              value={settings.refreshSeconds}
              options={REFRESH_OPTIONS}
              onSelect={(v) => update({ refreshSeconds: v })}
            />
          </Row>

          <Row label="Strip expiry" hint="Tenor the market strip's IV/RV pair and max pain follow.">
            <Pick
              label="Strip expiry"
              value={settings.stripTenor}
              options={TENOR_OPTIONS}
              onSelect={(v) => update({ stripTenor: v })}
            />
          </Row>
        </div>

        <div className="modal__foot">
          <span className="modal__note">
            Expiry, DTE and window controls sit in each chart’s header, and each chart keeps its
            own.
          </span>
          <button type="button" className="modal__done" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
