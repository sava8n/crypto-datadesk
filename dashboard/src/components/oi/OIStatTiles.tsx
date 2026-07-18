import { useMemo } from 'react';
import type { OIByStrikeResponse } from '../../types';
import { oiFull, usdFull } from '../../utils/format';
import { oiStats } from './stats';

function Tile({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className={`oi-stat oi-stat--${accent}`}>
      <span className="oi-stat__label">{label}</span>
      <span className="oi-stat__value">{value}</span>
    </div>
  );
}

export default function OIStatTiles({ data }: { data: OIByStrikeResponse }) {
  const stats = useMemo(() => oiStats(data), [data]);

  return (
    <div className="oi-stats">
      <Tile label="CALL OPEN INTEREST" value={oiFull(stats.callOI)} accent="call" />
      <Tile label="PUT OPEN INTEREST" value={oiFull(stats.putOI)} accent="put" />
      <Tile label="TOTAL OPEN INTEREST" value={oiFull(stats.totalOI)} accent="total" />
      <Tile
        label="PUT/CALL RATIO"
        value={stats.pcRatio != null ? stats.pcRatio.toFixed(2) : '—'}
        accent="pcr"
      />
      <Tile label="NOTIONAL VALUE" value={usdFull(stats.notional)} accent="notional" />
      {stats.maxPain != null && (
        <Tile label="MAX PAIN PRICE" value={usdFull(stats.maxPain)} accent="maxpain" />
      )}
    </div>
  );
}
