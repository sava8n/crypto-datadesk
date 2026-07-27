import { useState } from 'react';

interface Props {
  min: number;
  max: number;
  onChange: (min: number, max: number) => void;
}

const text = (v: number) => (Number.isFinite(v) ? String(v) : '');

export default function DTEControl({ min, max, onChange }: Props) {
  const [minText, setMinText] = useState(() => text(min));
  const [maxText, setMaxText] = useState(() => text(max));
  const [emitted, setEmitted] = useState({ min, max });

  // Resync the boxes only when the window is reset from outside.
  // An edit made here echoes back as the value it just emitted, which must not
  // rewrite the text. Empty min reads as 0, empty max as unbounded.
  if (emitted.min !== min || emitted.max !== max) {
    setEmitted({ min, max });
    setMinText(text(min));
    setMaxText(text(max));
  }

  const emit = (minT: string, maxT: string) => {
    const nextMin = minT === '' ? 0 : Number(minT);
    const nextMax = maxT === '' ? Infinity : Number(maxT);
    setEmitted({ min: nextMin, max: nextMax });
    onChange(nextMin, nextMax);
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
