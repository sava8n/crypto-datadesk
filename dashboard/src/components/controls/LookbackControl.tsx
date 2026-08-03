import { LOOKBACKS, type LookbackDays } from '../../config';

const label = (days: number) => (days === 365 ? '1Y' : `${days}D`);

interface Props {
  days: LookbackDays;
  onChange: (days: LookbackDays) => void;
}

export default function LookbackControl({ days, onChange }: Props) {
  return (
    <label className="expiry">
      <span className="expiry__label">LOOKBACK</span>
      <select
        className="expiry__select"
        value={days}
        onChange={(e) => onChange(Number(e.target.value) as LookbackDays)}
      >
        {LOOKBACKS.map((d) => (
          <option key={d} value={d}>
            {label(d)}
          </option>
        ))}
      </select>
    </label>
  );
}
