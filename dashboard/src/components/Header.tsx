import { useStats } from '../api/queries';
import { useCurrency, useSettings } from '../settings/store';
import { tenorOf } from '../utils/expiry';
import { dvolFmt, pctWhole, priceWhole } from '../utils/format';
import GearIcon from './icons/GearIcon';

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
        <GearIcon className="gear__icon" />
        Settings
      </button>
    </header>
  );
}
