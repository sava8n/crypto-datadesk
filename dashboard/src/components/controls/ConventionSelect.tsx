import type { ExposureConvention } from '../../types';

export const CONVENTIONS: { value: ExposureConvention; label: string }[] = [
  { value: 'assumption', label: 'ASSUMED' },
  { value: 'flow', label: 'FLOW' },
];

interface Props {
  convention: ExposureConvention;
  onSelect: (c: ExposureConvention) => void;
}

// how dealer inventory is signed: the classic assumption or cumulative taker flow
export default function ConventionSelect({ convention, onSelect }: Props) {
  return (
    <label className="expiry">
      <span className="expiry__label">SIGN</span>
      <select
        className="expiry__select"
        value={convention}
        onChange={(e) => onSelect(e.target.value as ExposureConvention)}
      >
        {CONVENTIONS.map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
