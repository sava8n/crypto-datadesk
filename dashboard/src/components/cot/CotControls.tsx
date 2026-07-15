import type { CotMethod, CotWindow } from '../../api/client';
import { FLOW_WEEKS } from './flow';
import { COT_METHODS } from './methods';
import { COT_WINDOWS } from './windows';

interface Props {
  window: CotWindow;
  method: CotMethod;
  flowWeeks: number;
  onWindow: (w: CotWindow) => void;
  onMethod: (m: CotMethod) => void;
  onFlowWeeks: (n: number) => void;
}

export default function CotControls({
  window,
  method,
  flowWeeks,
  onWindow,
  onMethod,
  onFlowWeeks,
}: Props) {
  return (
    <div className="cot-controls">
      <label className="expiry">
        <span className="expiry__label">INDEX WINDOW</span>
        <select
          className="expiry__select"
          value={window}
          onChange={(e) => onWindow(Number(e.target.value) as CotWindow)}
        >
          {COT_WINDOWS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className="expiry">
        <span className="expiry__label">INDEX METHOD</span>
        <select
          className="expiry__select"
          value={method}
          onChange={(e) => onMethod(e.target.value as CotMethod)}
        >
          {COT_METHODS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className="expiry">
        <span className="expiry__label">FLOW LOOKBACK</span>
        <select
          className="expiry__select"
          value={flowWeeks}
          onChange={(e) => onFlowWeeks(Number(e.target.value))}
        >
          {FLOW_WEEKS.map((n) => (
            <option key={n} value={n}>
              {n}W
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
