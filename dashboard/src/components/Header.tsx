import { useStats } from '../api/queries';
import { dvolFmt, pctWhole, priceWhole } from '../utils/format';
import { useCurrency } from '../settings/store';

function Field({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="field">
      <span className="field__k">{label}</span>
      <span className={`field__v${highlight ? ' field__v--amber' : ''}`}>{value}</span>
    </div>
  );
}

export default function Header({ onOpenSettings }: { onOpenSettings: () => void }) {
  const currency = useCurrency();
  const { data } = useStats(currency);

  return (
    <header className="header">
      <div className="header__brand">◆ DATADESK</div>
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
          label="IV30/RV30"
          value={
            data?.iv30 != null && data?.rv30 != null
              ? `${pctWhole(data.iv30)}/${pctWhole(data.rv30)}`
              : '-'
          }
        />
        <Field label="SRC" value="DERIBIT" />
      </div>
      <button
        type="button"
        className="gear"
        onClick={onOpenSettings}
        aria-label="Settings"
        title="SETTINGS"
      >
        ⚙
      </button>
    </header>
  );
}
