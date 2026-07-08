import { COT_CATEGORIES } from '../../theme/charts';
import type { CotReportResponse } from '../../types';
import { btcEquivSigned, btcFull, expiryLabel, signedPct } from '../../utils/format';
import { methodLabel } from './methods';
import { biggestMover } from './mover';
import { windowLabel } from './windows';

const COLOR_BY_KEY = Object.fromEntries(COT_CATEGORIES.map((c) => [c.key, c.color]));

const deltaClass = (v: number | null) =>
  v == null || v === 0 ? undefined : v > 0 ? 'cot-up' : 'cot-down';

export default function CotChangesTable({ data }: { data: CotReportResponse }) {
  const mover = biggestMover(data.rows);

  return (
    <>
      <div className="cot-table-wrap">
        <table className="cot-table">
          <thead>
            <tr>
              <th>CATEGORY</th>
              <th>LONG</th>
              <th>SHORT</th>
              <th>SPREAD</th>
              <th>NET</th>
              <th>ΔNET</th>
              <th>ΔNET%</th>
              <th>NET %OI</th>
              <th>INDEX</th>
              <th>TRADERS L/S</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr
                key={row.category}
                className={
                  row.category === mover?.category ? 'cot-table__row--mover' : undefined
                }
              >
                <td>
                  <span
                    className="cot-table__chip"
                    style={{ background: COLOR_BY_KEY[row.category] }}
                  />
                  {row.label}
                </td>
                <td>{btcFull(row.long_btc)}</td>
                <td>{btcFull(row.short_btc)}</td>
                <td>{row.spread_btc != null ? btcFull(row.spread_btc) : '—'}</td>
                <td>{btcFull(row.net_btc)}</td>
                <td className={deltaClass(row.delta_net_btc)}>
                  {row.delta_net_btc != null ? btcEquivSigned(row.delta_net_btc) : '—'}
                </td>
                <td className={deltaClass(row.delta_net_pct)}>
                  {row.delta_net_pct != null ? signedPct(row.delta_net_pct) : '—'}
                </td>
                <td>{row.net_pct_of_oi != null ? `${row.net_pct_of_oi.toFixed(1)}%` : '—'}</td>
                <td>
                  {row.index != null ? (
                    <span
                      className={
                        row.index >= 85 || row.index <= 15 ? 'cot-table__extreme' : undefined
                      }
                    >
                      {row.index.toFixed(0)}
                      {row.index >= 85 ? ' ▲' : row.index <= 15 ? ' ▼' : ''}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td>
                  {row.traders_long != null && row.traders_short != null
                    ? `${row.traders_long}/${row.traders_short}`
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="cot-foot">
        {data.micro_included_from
          ? `MICRO INCL. FROM ${expiryLabel(data.micro_included_from)} · `
          : ''}
        Δ VS PRIOR REPORT · NET EXCL. SPREAD · INDEX {windowLabel(data.window)}{' '}
        {methodLabel(data.method)}
      </div>
    </>
  );
}
