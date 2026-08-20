import { useMemo } from 'react';
import type { OIByStrikeResponse } from '../../types';
import { countFull, usdFull, usdWhole } from '../../utils/format';
import { oiStats } from './stats';

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="oi-stat">
      <span className="oi-stat__label">{label}</span>
      <span className="oi-stat__value">{value}</span>
    </div>
  );
}

export default function OIStatTiles({ data }: { data: OIByStrikeResponse }) {
  const stats = useMemo(() => oiStats(data), [data]);

  return (
    <div className="oi-stats">
      <Tile label="CALL OPEN INTEREST" value={countFull(stats.callOI)} />
      <Tile label="PUT OPEN INTEREST" value={countFull(stats.putOI)} />
      <Tile label="TOTAL OPEN INTEREST" value={countFull(stats.totalOI)} />
      <Tile label="PUT/CALL RATIO" value={stats.pcRatio != null ? stats.pcRatio.toFixed(2) : '-'} />
      <Tile label="NOTIONAL VALUE" value={usdWhole(stats.notional)} />
      {stats.maxPain != null && <Tile label="MAX PAIN PRICE" value={usdFull(stats.maxPain)} />}
    </div>
  );
}
