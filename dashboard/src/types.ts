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

export interface ProbCurvesResponse {
  currency: string;
  spot: number;
  as_of: string;
  points: ProbCurvePoint[];
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

// COT values are coin-equivalent contracts (for BTC: 5×CME Bitcoin + 0.1×Micro)

export interface CotReportRow {
  category: string;
  label: string;
  long: number;
  short: number;
  spread: number | null; // null, category has no spread series
  net: number;
  delta_net: number | null; // null on the first report
  delta_net_pct: number | null; // null when the prior net sits at zero
  net_pct_of_oi: number | null;
  index: number | null; // null while the window is unfilled
  traders_long: number | null; // null, CFTC reports no nonrept counts
  traders_short: number | null;
}

export interface CotReportResponse {
  currency: string;
  as_of: string;
  report_date: string;
  prev_report_date: string | null;
  publication_date: string;
  is_new: boolean;
  is_stale: boolean;
  window: number;
  method: string;
  oi: number;
  delta_oi: number | null;
  price: number | null;
  oi_usd: number | null;
  micro_included_from: string | null;
  rows: CotReportRow[];
}

export interface CotHistoryPoint {
  report_date: string;
  oi: number;
  price: number | null;
  dealer_net: number;
  dealer_delta: number | null;
  asset_mgr_net: number;
  asset_mgr_delta: number | null;
  lev_money_net: number;
  lev_money_delta: number | null;
  other_rept_net: number;
  other_rept_delta: number | null;
  nonrept_net: number;
  nonrept_delta: number | null;
}

export interface CotHistoryResponse {
  currency: string;
  as_of: string;
  micro_included_from: string | null;
  price_from: string | null;
  points: CotHistoryPoint[];
}

export interface CotIndexPoint {
  report_date: string;
  dealer: number | null;
  asset_mgr: number | null;
  lev_money: number | null;
  other_rept: number | null;
  nonrept: number | null;
}

export interface CotIndexResponse {
  currency: string;
  as_of: string;
  window: number;
  method: string;
  points: CotIndexPoint[];
}
