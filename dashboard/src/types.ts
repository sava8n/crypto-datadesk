// Mirrors the response models in core/api/schemas/, so a response is used as it arrives.
// Field-level meaning lives there; do not restate it here.

export type OptionType = 'C' | 'P';

export interface CurrencyEnvelope {
  currency: string;
}

export interface MarketEnvelope extends CurrencyEnvelope {
  spot: number;
  as_of: string;
}

export interface BaselineEnvelope extends MarketEnvelope {
  window: RecentWindow;
  baseline_as_of: string | null;
  baseline_stale: boolean;
}

export interface SpanEnvelope extends CurrencyEnvelope {
  start: string;
  end: string;
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
  prob_above: number;
  option_type: OptionType;
}

export interface ProbQuantilePoint {
  expiry: string;
  tte_years: number;
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
  rr: number;
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

export interface StatsResponse extends MarketEnvelope {
  dvol: number | null;
  dvol_rank: number | null;
  iv7: number | null;
  rv7: number | null;
  iv30: number | null;
  rv30: number | null;
  iv30_percentile: number | null;
}

export interface SpotCandle {
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

export interface OIByExpiryPoint {
  expiry: string;
  tte_years: number;
  itm_calls: number;
  otm_calls: number;
  itm_puts: number;
  otm_puts: number;
}

export interface OIByExpiryResponse extends MarketEnvelope {
  points: OIByExpiryPoint[];
}

// how dealer inventory is signed: the classic calls+/puts- assumption or cumulative taker flow
export type ExposureConvention = 'assumption' | 'flow';

export interface ExposureEnvelope extends MarketEnvelope {
  convention: ExposureConvention;
  tape_start: string | null;
  oi_explained_fraction: number | null;
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
  intrinsic_value: number | null;
}

export interface OIByStrikeResponse extends MarketEnvelope {
  expiries: string[];
  expiry: string | null;
  max_pain: number | null;
  points: OIByStrikePoint[];
}

// live tape / intraday archive spans; and the daily-series spans
export type RecentWindow = '24h' | '7d';
export type ArchiveWindow = '7d' | '30d' | '90d' | '1y';

export interface MaxPainPoint {
  expiry: string;
  tte_years: number;
  max_pain: number | null;
}

export interface MaxPainResponse extends MarketEnvelope {
  points: MaxPainPoint[];
}

export type ExposureGreek = 'gamma' | 'vanna' | 'charm';

export interface ExposureByStrikePoint {
  strike: number;
  call_exposure: number;
  put_exposure: number;
  net_exposure: number;
}

export interface ExposureByStrikeResponse extends ExposureEnvelope {
  greek: ExposureGreek;
  gex_flip: number | null;
  points: ExposureByStrikePoint[];
}

export interface SmileHistoryResponse extends BaselineEnvelope {
  expiry: string;
  points: IVCurvePoint[];
}

export interface OIChangeByStrikePoint {
  strike: number;
  call_oi_change: number;
  put_oi_change: number;
}

export interface OIChangeByStrikeResponse extends BaselineEnvelope {
  expiries: string[];
  expiry: string | null;
  points: OIChangeByStrikePoint[];
}

export interface RVConePoint {
  days: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  current: number | null;
}

export interface RVConeResponse extends MarketEnvelope {
  points: RVConePoint[];
}

// tape-backed aggregates over a trailing window; no live-market dependency
export interface FlowEnvelope extends SpanEnvelope {
  window: RecentWindow;
  tape_start: string | null;
}

// net taker flow: buys - sells, in contracts and USD premium
export interface FlowByStrikePoint {
  strike: number;
  call_contracts: number;
  put_contracts: number;
  call_premium: number;
  put_premium: number;
}

export interface FlowByStrikeResponse extends FlowEnvelope {
  points: FlowByStrikePoint[];
}

export interface FlowByExpiryPoint {
  expiry: string;
  call_contracts: number;
  put_contracts: number;
  call_premium: number;
  put_premium: number;
}

export interface FlowByExpiryResponse extends FlowEnvelope {
  points: FlowByExpiryPoint[];
}

export interface TapePrint {
  trade_id: string;
  ts: string;
  instrument_name: string;
  expiry: string;
  strike: number;
  option_type: OptionType;
  direction: 'buy' | 'sell';
  price: number;
  amount: number;
  iv: number | null;
  premium: number | null;
  block_trade_id: string | null;
  liquidation: string | null;
}

export interface TapeResponse extends CurrencyEnvelope {
  points: TapePrint[];
}

export interface ExpiryOutcomePoint {
  expiry: string;
  reference_as_of: string;
  spot_ref: number;
  em_implied: number | null;
  settlement: number;
  realized_move: number;
}

export interface ExpiryOutcomesResponse extends CurrencyEnvelope {
  points: ExpiryOutcomePoint[];
}

export type Resolution = '1h' | '1d';

// archive-backed series: the queried window, no live spot, no upstream dependency
export interface HistoryEnvelope extends SpanEnvelope {
  resolution: Resolution;
}

export interface VolHistoryPoint {
  as_of: string;
  spot: number;
  iv7: number | null;
  iv30: number | null;
  term_slope: number | null;
  rv7: number | null;
  rv30: number | null;
  dvol: number | null;
  rr25_7: number | null;
  bf25_7: number | null;
  rr25_30: number | null;
  bf25_30: number | null;
}

export interface VolHistoryResponse extends HistoryEnvelope {
  points: VolHistoryPoint[];
}

export interface PositioningHistoryPoint {
  as_of: string;
  spot: number;
  oi_total_calls: number | null;
  oi_total_puts: number | null;
  gex_net_total: number | null;
  gex_flip: number | null;
  max_pain_front: number | null;
}

export interface PositioningHistoryResponse extends HistoryEnvelope {
  points: PositioningHistoryPoint[];
}

export interface CMBandPoint {
  tenor_days: number;
  atm_iv_p25: number | null;
  atm_iv_p50: number | null;
  atm_iv_p75: number | null;
  rr25_p25: number | null;
  rr25_p50: number | null;
  rr25_p75: number | null;
  bf25_p25: number | null;
  bf25_p50: number | null;
  bf25_p75: number | null;
  count: number;
}

export interface CMBandsResponse extends HistoryEnvelope {
  points: CMBandPoint[];
}

export type ReportImportance = 'high' | 'med' | 'low';
export type ReferenceRole = 'citation' | 'further_reading';

export interface ReportReference {
  id: number;
  title: string;
  url: string;
  note: string;
  role: ReferenceRole;
}

export interface ReportCalendarEvent {
  date: string;
  time_utc: string | null;
  title: string;
  note: string;
  importance: ReportImportance;
}

export interface ReportPayload {
  headline: string;
  standfirst: string;
  body_md: string;
  references: ReportReference[];
  calendar: ReportCalendarEvent[];
}

export interface ReportListItem {
  id: number;
  generated_at: string;
  headline: string;
}

export interface ReportListResponse {
  reports: ReportListItem[];
}

export interface ReportDetail {
  id: number;
  generated_at: string;
  next_report_at: string;
  payload: ReportPayload;
}
