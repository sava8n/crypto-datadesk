import { ARCHIVE_WINDOWS } from '../../config';
import type { ArchiveWindow } from '../../types';

interface Props {
  window: ArchiveWindow;
  onChange: (window: ArchiveWindow) => void;
}

export default function LookbackControl({ window, onChange }: Props) {
  return (
    <label className="expiry">
      <span className="expiry__label">LOOKBACK</span>
      <select
        className="expiry__select"
        value={window}
        onChange={(e) => onChange(e.target.value as ArchiveWindow)}
      >
        {ARCHIVE_WINDOWS.map((w) => (
          <option key={w} value={w}>
            {w.toUpperCase()}
          </option>
        ))}
      </select>
    </label>
  );
}
