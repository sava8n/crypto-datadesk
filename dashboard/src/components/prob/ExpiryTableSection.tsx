import { useMemo } from 'react';

import { useExpiryOutcomes, useMaxPain, useProbCurves } from '../../api/queries';
import Panel from '../panel/Panel';
import { MIN_POINTS } from '../panel/minPoints';
import { panelState } from '../panel/panelState';
import { useCurrency } from '../../settings/store';
import { dteLabel, dateLabel, priceWhole } from '../../utils/format';
import {
  buildExpiryRows,
  buildSettledRows,
  type ExpiryRow,
  type SettledRow,
} from './expiryTable';

const signedPct = (v: number) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)}%`;

interface TableData {
  live: ExpiryRow[];
  settled: SettledRow[];
}

function LiveRow({ row }: { row: ExpiryRow }) {
  return (
    <tr>
      <td>{dateLabel(row.expiry)}</td>
      <td>{dteLabel(row.dte)}</td>
      <td>{row.maxPain != null ? priceWhole(row.maxPain) : '-'}</td>
      <td>{row.maxPainPct != null ? signedPct(row.maxPainPct) : '-'}</td>
      <td>{row.em != null ? `±${priceWhole(row.em)}` : '-'}</td>
      <td>{row.emPct != null ? `±${(row.emPct * 100).toFixed(1)}%` : '-'}</td>
      <td>-</td>
    </tr>
  );
}

function SettledTableRow({ row }: { row: SettledRow }) {
  return (
    <tr className="exp-table__settled">
      <td>{dateLabel(row.expiry)}</td>
      <td>SETTLED</td>
      <td>-</td>
      <td>-</td>
      <td>{row.em != null ? `±${priceWhole(row.em)}` : '-'}</td>
      <td>{row.emPct != null ? `±${(row.emPct * 100).toFixed(1)}%` : '-'}</td>
      <td>{priceWhole(row.realized)}</td>
    </tr>
  );
}

export default function ExpiryTableSection() {
  const currency = useCurrency();
  const maxPain = useMaxPain(currency);
  // the quantiles ride the prob-curves query the other probability panels already poll
  const prob = useProbCurves(currency);
  // settled implied-vs-realized comes from the archive; unreachable = no settled rows
  const outcomes = useExpiryOutcomes(currency);

  const value: TableData | undefined = useMemo(() => {
    if (!maxPain.data) return undefined;
    return {
      live: buildExpiryRows(maxPain.data, prob.data?.quantiles ?? []),
      settled: buildSettledRows(outcomes.data?.points ?? []),
    };
  }, [maxPain.data, prob.data, outcomes.data]);
  const state = panelState(maxPain, value, value?.live.length ?? 0, MIN_POINTS.bars);

  return (
    <Panel
      title="EXPIRIES"
      subtitle="MAX PAIN · IMPLIED ±1σ MOVE · REALIZED × EXPIRY"
      state={state}
    >
      {(data) => (
        <div className="exp-table">
          <table>
            <thead>
              <tr>
                <th>EXPIRY</th>
                <th>DTE</th>
                <th>MAX PAIN</th>
                <th>Δ SPOT</th>
                <th>EM ±1σ</th>
                <th>EM %</th>
                <th>REALIZED</th>
              </tr>
            </thead>
            <tbody>
              {data.live.map((row) => (
                <LiveRow key={row.expiry} row={row} />
              ))}
              {data.settled.map((row) => (
                <SettledTableRow key={row.expiry} row={row} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
