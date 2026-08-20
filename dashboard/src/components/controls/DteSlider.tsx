import { MAX_DTE_LIMIT } from '../../config';

interface Props {
  min: number;
  max: number;
  onCommit: (min: number, max: number) => void;
}

/** Dual-thumb DTE range: two stacked native ranges, thumbs alone catch the pointer. */
export default function DteSlider({ min, max, onCommit }: Props) {
  const lo = Math.min(min, MAX_DTE_LIMIT);
  const hi = Math.min(max, MAX_DTE_LIMIT);
  const pct = (v: number) => (v / MAX_DTE_LIMIT) * 100;

  return (
    <div className="range">
      <div className="range__rail" />
      <div
        className="range__fill"
        style={{ left: `${pct(lo)}%`, width: `${pct(hi) - pct(lo)}%` }}
      />
      <input
        type="range"
        min={0}
        max={MAX_DTE_LIMIT}
        value={lo}
        aria-label="DTE minimum"
        onChange={(e) => onCommit(Math.min(Number(e.target.value), hi), hi)}
      />
      <input
        type="range"
        min={0}
        max={MAX_DTE_LIMIT}
        value={hi}
        aria-label="DTE maximum"
        onChange={(e) => onCommit(lo, Math.max(Number(e.target.value), lo))}
      />
    </div>
  );
}
