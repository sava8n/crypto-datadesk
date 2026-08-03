import { dateLabel } from '../../utils/format';

interface Props {
  expiries: string[];
  selected: string | null;
  onSelect: (expiry: string) => void;
  // when set, an extra option selecting every expiry at once
  allLabel?: string;
}

export default function ExpirySelect({ expiries, selected, onSelect, allLabel }: Props) {
  const empty = expiries.length === 0;

  return (
    <label className="expiry">
      <span className="expiry__label">EXPIRY</span>
      <select
        className="expiry__select"
        value={selected ?? ''}
        onChange={(e) => onSelect(e.target.value)}
        disabled={empty && allLabel === undefined}
      >
        {allLabel !== undefined && <option value="">{allLabel}</option>}
        {empty && allLabel === undefined && <option value="">-</option>}
        {expiries.map((iso) => (
          <option key={iso} value={iso}>
            {dateLabel(iso)}
          </option>
        ))}
      </select>
    </label>
  );
}
