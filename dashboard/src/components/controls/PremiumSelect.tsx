import { MIN_PREMIUMS } from '../flow/tape';

interface Props {
  minPremium: number;
  onSelect: (v: number) => void;
}

// USD premium floor on the tape; 0 shows every print
export default function PremiumSelect({ minPremium, onSelect }: Props) {
  return (
    <label className="expiry">
      <span className="expiry__label">PREM</span>
      <select
        className="expiry__select"
        value={minPremium}
        onChange={(e) => onSelect(Number(e.target.value))}
      >
        {MIN_PREMIUMS.map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
