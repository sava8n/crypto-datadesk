// mirrors core/schemas/

export interface IVSurfacePoint {
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
  points: IVSurfacePoint[];
}

export interface IVCurvePoint {
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
  points: IVCurvePoint[];
}

export interface ProbCurvePoint {
  expiry: string;
  tte_years: number;
  strike: number;
  prob_above: number; // P(S_T > K) under the forward measure, in [0, 1]
  option_type: string;
}

export interface ProbQuantileRow {
  expiry: string;
  tte_years: number;
  p16: number | null; // K with P(S_T <= K) = 0.16; null when the curve does not span it
  p50: number | null;
  p84: number | null;
}

export interface ProbCurvesResponse {
  currency: string;
  spot: number;
  as_of: string;
  points: ProbCurvePoint[];
  quantiles: ProbQuantileRow[];
}

export interface SkewPoint {
  expiry: string;
  tte_years: number;
  rr: number;
  bf: number;
}

export interface SkewResponse {
  currency: string;
  spot: number;
  as_of: string;
  points: SkewPoint[];
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

export interface StatsResponse {
  currency: string;
  spot: number;
  as_of: string;
  dvol: number | null; // 30d DVOL index as a decimal (0.38 = index 38)
  dvol_rank: number | null; // last close's position in the trailing-year range, [0, 1]
  iv30: number | null; // 30d constant-maturity ATM IV
  rv30: number | null; // 30d close-to-close realized vol, annualized
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

export interface VolumeByStrikePoint {
  strike: number;
  call_volume: number;
  put_volume: number;
}

export interface VolumeByStrikeResponse {
  currency: string;
  spot: number;
  as_of: string;
  points: VolumeByStrikePoint[];
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
