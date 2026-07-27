// Mirrors core/api/schemas/ field for field, so a response is used as it arrives.

export type OptionType = 'C' | 'P';

// which book, at what price, as of when - carried by every market response
export interface MarketEnvelope {
  currency: string;
  spot: number;
  // observation time, not response time: a frozen value means upstream is down
  as_of: string;
}

export interface IVSurfacePoint {
  expiry: string;
  tte_years: number;
  delta: number;
  mark_iv: number;
  option_type: OptionType;
}

export interface IVSurfaceResponse extends MarketEnvelope {
  points: IVSurfacePoint[];
}

export interface IVCurvePoint {
  expiry: string;
  tte_years: number;
  strike: number;
  mark_iv: number;
  option_type: OptionType;
}

export interface IVCurvesResponse extends MarketEnvelope {
  points: IVCurvePoint[];
}

export interface ProbCurvePoint {
  expiry: string;
  tte_years: number;
  strike: number;
  // P(S_T > K) under the forward measure, in [0, 1]
  prob_above: number;
  option_type: OptionType;
}

export interface ProbQuantilePoint {
  expiry: string;
  tte_years: number;
  // K with P(S_T <= K) = 0.16; null when the curve does not span it
  p16: number | null;
  p50: number | null;
  p84: number | null;
}

export interface ProbCurvesResponse extends MarketEnvelope {
  points: ProbCurvePoint[];
  quantiles: ProbQuantilePoint[];
}

export interface SkewPoint {
  expiry: string;
  tte_years: number;
  // 25-delta risk reversal
  rr: number;
  // 25-delta butterfly
  bf: number;
}

export interface SkewResponse extends MarketEnvelope {
  points: SkewPoint[];
}

export interface TermStructurePoint {
  expiry: string;
  tte_years: number;
  atm_iv: number;
  forward: number;
}

export interface TermStructureResponse extends MarketEnvelope {
  points: TermStructurePoint[];
}

export interface GreeksChainPoint {
  expiry: string;
  tte_years: number;
  strike: number;
  option_type: OptionType;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
}

export interface GreeksChainResponse extends MarketEnvelope {
  // selector list, near-dated first
  expiries: string[];
  points: GreeksChainPoint[];
}

export interface StatsResponse extends MarketEnvelope {
  // 30d DVOL index as a decimal (0.38 = index 38)
  dvol: number | null;
  // last close's position in the trailing-year range, [0, 1]
  dvol_rank: number | null;
  // 30d constant-maturity ATM IV
  iv30: number | null;
  // 30d close-to-close realized vol, annualized
  rv30: number | null;
}

export interface SpotCandle {
  // candle open time
  ts: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SpotHistoryResponse extends MarketEnvelope {
  instrument: string;
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

export interface OIByExpirationResponse extends MarketEnvelope {
  points: OIByExpirationPoint[];
}

export interface GEXByStrikePoint {
  strike: number;
  call_gex: number;
  put_gex: number;
  net_gex: number;
}

export interface GEXByStrikeResponse extends MarketEnvelope {
  // zero-gamma level: cumulative net-GEX crossing nearest spot
  gex_flip: number | null;
  points: GEXByStrikePoint[];
}

export interface VolumeByStrikePoint {
  strike: number;
  call_volume: number;
  put_volume: number;
}

export interface VolumeByStrikeResponse extends MarketEnvelope {
  points: VolumeByStrikePoint[];
}

export interface OIByStrikePoint {
  strike: number;
  itm_calls: number;
  otm_calls: number;
  itm_puts: number;
  otm_puts: number;
  // single-expiry only
  intrinsic_value: number | null;
}

export interface OIByStrikeResponse extends MarketEnvelope {
  expiries: string[];
  // selected expiry; null = all
  expiry: string | null;
  // single-expiry only
  max_pain: number | null;
  points: OIByStrikePoint[];
}
