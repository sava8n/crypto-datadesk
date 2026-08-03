import type { RecentWindow } from '../../types';

export const WINDOWS: { value: RecentWindow; label: string }[] = [
  { value: '24h', label: '24H' },
  { value: '7d', label: '7D' },
];

interface Props {
  window: RecentWindow;
  onSelect: (w: RecentWindow) => void;
}

// which archived baseline a panel diffs against
export default function WindowSelect({ window, onSelect }: Props) {
  return (
    <label className="expiry">
      <span className="expiry__label">WINDOW</span>
      <select
        className="expiry__select"
        value={window}
        onChange={(e) => onSelect(e.target.value as RecentWindow)}
      >
        {WINDOWS.map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
