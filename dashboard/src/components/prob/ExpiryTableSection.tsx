import { useMemo } from 'react';

import { useMaxPain, useProbCurves } from '../../api/queries';
import Panel from '../panel/Panel';
import { MIN_POINTS } from '../panel/minPoints';
import { panelState } from '../panel/panelState';
import { useCurrency } from '../../settings/store';
import { dteLabel, expiryLabel, priceWhole } from '../../utils/format';
import { buildExpiryRows, type ExpiryRow } from './expiryTable';

const signedPct = (v: number) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)}%`;

function Row({ row }: { row: ExpiryRow }) {
  return (
    <tr>
      <td>{expiryLabel(row.expiry)}</td>
      <td>{dteLabel(row.dte)}</td>
      <td>{row.maxPain != null ? priceWhole(row.maxPain) : '-'}</td>
      <td>{row.maxPainPct != null ? signedPct(row.maxPainPct) : '-'}</td>
      <td>{row.em != null ? `±${priceWhole(row.em)}` : '-'}</td>
      <td>{row.emPct != null ? `±${(row.emPct * 100).toFixed(1)}%` : '-'}</td>
    </tr>
  );
}

export default function ExpiryTableSection() {
  const currency = useCurrency();
  const maxPain = useMaxPain(currency);
  // the quantiles ride the prob-curves query the other probability panels already poll
  const prob = useProbCurves(currency);

  const rows = useMemo(
    () => (maxPain.data ? buildExpiryRows(maxPain.data, prob.data?.quantiles ?? []) : undefined),
    [maxPain.data, prob.data],
  );
  const state = panelState(maxPain, rows, rows?.length ?? 0, MIN_POINTS.bars);

  return (
    <Panel title="EXPIRIES" subtitle="MAX PAIN · IMPLIED ±1σ MOVE × EXPIRY" state={state}>
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
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <Row key={row.expiry} row={row} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
