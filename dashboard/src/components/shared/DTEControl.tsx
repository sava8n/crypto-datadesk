import { useState } from 'react';

interface Props {
  defaultMin: number;
  defaultMax: number;
  onChange: (min: number, max: number) => void;
}

// days-to-expiry window control for the multi-expiry IV charts
export default function DTEControl({ defaultMin, defaultMax, onChange }: Props) {
  const [minText, setMinText] = useState(String(defaultMin));
  const [maxText, setMaxText] = useState(String(defaultMax));

  const emit = (minT: string, maxT: string) => {
    onChange(minT === '' ? 0 : Number(minT), maxT === '' ? Infinity : Number(maxT));
  };

  return (
    <div className="dte">
      <span className="dte__label">DTE</span>
      <input
        className="dte__input"
        type="number"
        min={0}
        value={minText}
        onChange={(e) => {
          setMinText(e.target.value);
          emit(e.target.value, maxText);
        }}
      />
      <span className="dte__label">–</span>
      <input
        className="dte__input"
        type="number"
        min={0}
        value={maxText}
        onChange={(e) => {
          setMaxText(e.target.value);
          emit(minText, e.target.value);
        }}
      />
      <span className="dte__label">D</span>
    </div>
  );
}
