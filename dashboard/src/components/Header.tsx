import { useStats } from '../api/queries';
import { tenorOf } from '../utils/expiry';
import { dvolFmt, pctWhole, priceWhole } from '../utils/format';
import { useCurrency, useSettings } from '../settings/store';

function Field({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="field">
      <span className="field__k">{label}</span>
      <span className={`field__v${highlight ? ' field__v--hl' : ''}`}>{value}</span>
    </div>
  );
}

export default function Header({ onOpenSettings }: { onOpenSettings: () => void }) {
  const currency = useCurrency();
  const { expiry } = useSettings();
  const { data } = useStats(currency);

  // the headline vol pair tracks the tenor the rest of the dashboard is anchored to
  const weekly = tenorOf(expiry) === 'weekly';
  const iv = weekly ? data?.iv7 : data?.iv30;
  const rv = weekly ? data?.rv7 : data?.rv30;

  return (
    <header className="header">
      <div className="header__brand">Datadesk.</div>
      <div className="header__fields">
        <Field label="SYM" value={`${currency}-USD`} />
        <Field
          label="SPOT"
          value={data?.spot != null ? `$${priceWhole(data.spot)}` : '-'}
          highlight
        />
        <Field label="DVOL" value={data?.dvol != null ? dvolFmt(data.dvol) : '-'} />
        {/* true percentile once enough archive has accrued; DVOL range position until then */}
        <Field
          label={data?.iv30_percentile != null ? 'IV PCTL' : 'DVOL RANK'}
          value={
            data?.iv30_percentile != null
              ? pctWhole(data.iv30_percentile)
              : data?.dvol_rank != null
                ? pctWhole(data.dvol_rank)
                : '-'
          }
        />
        <Field
          label={weekly ? 'IV7/RV7' : 'IV30/RV30'}
          value={iv != null && rv != null ? `${pctWhole(iv)}/${pctWhole(rv)}` : '-'}
        />
        <Field label="SRC" value="DERIBIT" />
      </div>
      <button
        type="button"
        className="gear"
        onClick={onOpenSettings}
        aria-label="Settings"
        title="Settings"
      >
        <svg
          className="gear__icon"
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
        Settings
      </button>
    </header>
  );
}
