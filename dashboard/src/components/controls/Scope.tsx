import type { ReactNode } from 'react';

import { usePopover } from './usePopover';

export function Scopes({ children }: { children: ReactNode }) {
  return <div className="scopes">{children}</div>;
}

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onSelect: (v: T) => void;
}

export function ScopeSegmented<T extends string>({
  label,
  value,
  options,
  onSelect,
}: SegmentedProps<T>) {
  return (
    <div className="scope">
      <span className="scope__k">{label}</span>
      <div className="seg">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            className={`seg__chip${o.value === value ? ' seg__chip--active' : ''}`}
            onClick={() => onSelect(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

interface PopoverProps {
  label: string;
  value: string;
  width?: number;
  children: (close: () => void) => ReactNode;
}

export function ScopePopover({ label, value, width, children }: PopoverProps) {
  const { open, ref, toggle, close } = usePopover<HTMLDivElement>();

  return (
    <div className="picker" ref={ref}>
      <button type="button" className="picker__trigger" aria-expanded={open} onClick={toggle}>
        <span className="picker__label">{label}</span>
        <span className="picker__value">{value}</span>
        <span className="picker__caret" aria-hidden="true">
          ▾
        </span>
      </button>

      {open && (
        <div className="picker__menu" style={width ? { width } : undefined}>
          {children(close)}
        </div>
      )}
    </div>
  );
}

interface RowProps {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}

export function ScopeRow({ active, onClick, children }: RowProps) {
  return (
    <button
      type="button"
      className={`picker__row${active ? ' picker__row--active' : ''}`}
      onClick={onClick}
    >
      <span className="picker__row-v">{children}</span>
    </button>
  );
}
