import { useState } from 'react';

import { useTape } from '../../api/queries';
import type { TapePrint } from '../../types';
import Panel from '../panel/Panel';
import { MIN_POINTS } from '../panel/minPoints';
import { panelState } from '../panel/panelState';
import { useCurrency } from '../../settings/store';
import { countFull, pctOne, timeLabel, usdShort } from '../../utils/format';
import { MIN_PREMIUMS, instrumentLabel, tags } from './tape';

function PremiumSelect({
  minPremium,
  onSelect,
}: {
  minPremium: number;
  onSelect: (v: number) => void;
}) {
  return (
    <label className="expiry">
      <span className="expiry__label">PREM</span>
      <select
        className="expiry__select"
        value={minPremium}
        onChange={(e) => onSelect(Number(e.target.value))}
      >
        {MIN_PREMIUMS.map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Row({ print }: { print: TapePrint }) {
  return (
    <tr>
      <td>{timeLabel(print.ts)}</td>
      <td>{instrumentLabel(print)}</td>
      <td className={`tape-side--${print.direction}`}>{print.direction.toUpperCase()}</td>
      <td>{countFull(print.amount)}</td>
      <td>{print.premium != null ? usdShort(print.premium) : '-'}</td>
      <td>{print.iv != null ? `${pctOne(print.iv)}%` : '-'}</td>
      <td>{tags(print)}</td>
    </tr>
  );
}

export default function TapeSection() {
  const [minPremium, setMinPremium] = useState<number>(0);
  const query = useTape(useCurrency(), minPremium);
  const state = panelState(query, query.data, query.data?.points.length ?? 0, MIN_POINTS.bars);

  return (
    <Panel
      title="TAPE"
      subtitle="LATEST PRINTS · NEWEST FIRST"
      state={state}
      controls={<PremiumSelect minPremium={minPremium} onSelect={setMinPremium} />}
    >
      {(data) => (
        <div className="exp-table">
          <table>
            <thead>
              <tr>
                <th>TIME</th>
                <th>INSTRUMENT</th>
                <th>SIDE</th>
                <th>QTY</th>
                <th>PREM</th>
                <th>IV</th>
                <th>TAGS</th>
              </tr>
            </thead>
            <tbody>
              {data.points.map((print) => (
                <Row key={print.trade_id} print={print} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
