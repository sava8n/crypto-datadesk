import type { ExposureGreek } from '../../types';

// the higher-order greeks; gamma has its own panel
export const GREEKS: { value: ExposureGreek; label: string }[] = [
  { value: 'vanna', label: 'VANNA' },
  { value: 'charm', label: 'CHARM' },
];

interface Props {
  greek: ExposureGreek;
  onSelect: (g: ExposureGreek) => void;
}

export default function GreekSelect({ greek, onSelect }: Props) {
  return (
    <label className="expiry">
      <span className="expiry__label">GREEK</span>
      <select
        className="expiry__select"
        value={greek}
        onChange={(e) => onSelect(e.target.value as ExposureGreek)}
      >
        {GREEKS.map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
