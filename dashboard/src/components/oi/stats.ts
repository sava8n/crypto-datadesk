import type { OIByStrikeResponse } from '../../types';

export interface OIStats {
  callOI: number;
  putOI: number;
  totalOI: number;
  pcRatio: number | null; // put/call, null when there is no call OI
  notional: number; // totalOI * spot (Deribit coin option = 1 coin/contract)
  maxPain: number | null;
}

export function oiStats(data: OIByStrikeResponse): OIStats {
  let callOI = 0;
  let putOI = 0;
  for (const p of data.points) {
    callOI += p.itm_calls + p.otm_calls;
    putOI += p.itm_puts + p.otm_puts;
  }
  const totalOI = callOI + putOI;
  return {
    callOI,
    putOI,
    totalOI,
    pcRatio: callOI > 0 ? putOI / callOI : null,
    notional: totalOI * data.spot,
    maxPain: data.max_pain,
  };
}
