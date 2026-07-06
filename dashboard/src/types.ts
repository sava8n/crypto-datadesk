// mirrors core/schemas/

export interface SurfacePoint {
  expiry: string;
  tte_years: number;
  delta: number;
  mark_iv: number;
  option_type: string;
}

export interface IVSurfaceResponse {
  currency: string;
  spot: number;
  as_of: string;
  points: SurfacePoint[];
}

export interface CurvePoint {
  expiry: string;
  tte_years: number;
  strike: number;
  mark_iv: number;
  option_type: string;
}

export interface IVCurvesResponse {
  currency: string;
  spot: number;
  as_of: string;
  points: CurvePoint[];
}

export interface TermStructurePoint {
  expiry: string;
  tte_years: number;
  atm_iv: number;
  forward: number;
}

export interface TermStructureResponse {
  currency: string;
  spot: number;
  as_of: string;
  points: TermStructurePoint[];
}

export interface GreekChainPoint {
  expiry: string;
  tte_years: number;
  strike: number;
  option_type: string;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
}

export interface GreeksChainResponse {
  currency: string;
  spot: number;
  as_of: string;
  expiries: string[];
  points: GreekChainPoint[];
}

export interface SpotResponse {
  currency: string;
  spot: number;
  as_of: string;
}

export interface SpotCandle {
  ts: string; // candle open time
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SpotHistoryResponse {
  currency: string;
  instrument: string;
  as_of: string;
  candles: SpotCandle[];
}

export interface OIByExpirationPoint {
  expiry: string;
  tte_years: number;
  itm_calls: number;
  otm_calls: number;
  itm_puts: number;
  otm_puts: number;
}

export interface OIByExpirationResponse {
  currency: string;
  spot: number;
  as_of: string;
  points: OIByExpirationPoint[];
}

export interface GEXByStrikePoint {
  strike: number;
  call_gex: number;
  put_gex: number;
  net_gex: number;
}

export interface GEXByStrikeResponse {
  currency: string;
  spot: number;
  as_of: string;
  flip: number | null; // zero-gamma level: cumulative net-GEX crossing nearest spot
  points: GEXByStrikePoint[];
}

export interface OIByStrikePoint {
  strike: number;
  itm_calls: number;
  otm_calls: number;
  itm_puts: number;
  otm_puts: number;
  intrinsic_value: number | null; // single-expiry only
}

export interface OIByStrikeResponse {
  currency: string;
  spot: number;
  as_of: string;
  expiries: string[];
  expiry: string | null; // selected expiry; null = all
  max_pain: number | null; // single-expiry only
  points: OIByStrikePoint[];
}
