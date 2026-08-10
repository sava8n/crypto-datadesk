import type { ArchiveWindow, ExposureConvention, RecentWindow } from './types';

export const CURRENCIES = ['BTC'] as const;

export type Currency = (typeof CURRENCIES)[number];

// selectable spans for the history panels, in duration-token order
export const ARCHIVE_WINDOWS: readonly ArchiveWindow[] = ['7d', '30d', '90d', '1y'];

// baselines the flow and OI-change panels diff against
export const RECENT_WINDOWS: readonly { value: RecentWindow; label: string }[] = [
  { value: '24h', label: '24H' },
  { value: '7d', label: '7D' },
];

// how dealer inventory is signed: the classic assumption or cumulative taker flow
export const CONVENTIONS: readonly { value: ExposureConvention; label: string }[] = [
  { value: 'assumption', label: 'ASSUMED' },
  { value: 'flow', label: 'FLOW' },
];

// spot chart initial visible windows, days of daily candles
export const SPOT_LOOKBACKS: readonly { value: number; label: string }[] = [
  { value: 30, label: '30D' },
  { value: 90, label: '90D' },
  { value: 180, label: '180D' },
  { value: 365, label: '1Y' },
];

// DTE slider bound, covers the longest quoted chain
export const MAX_DTE_LIMIT = 365;

// the service caches one market state per currency for this long
// so a shorter poll period only re-serves the same snapshot
export const MIN_REFRESH_SECONDS = 10;

// poll period in ms, clamped to the service cache floor
export const refreshMs = (seconds: number): number =>
  Math.max(MIN_REFRESH_SECONDS, seconds) * 1000;

// user-tunable inputs
// the settings drawer overrides these and persists the overrides to localStorage
export interface Settings {
  currency: Currency;

  refreshSeconds: number;

  minDte: number;
  maxDte: number;

  // expiry shown on the per-expiry charts: 'weekly'/'monthly' track the front
  // expiry of that tenor, EXPIRY_ALL selects every expiry where a chart
  // supports it, anything else is a concrete ISO pick
  expiry: string;

  spotLookbackDays: number;

  // the single source for every chart; panels have no local overrides
  historyWindow: ArchiveWindow;

  exposureConvention: ExposureConvention;

  flowWindow: RecentWindow;

  // tape cutoff, in USD premium; 0 shows every print
  tapeMinPremium: number;
}

export const DEFAULT_SETTINGS: Settings = {
  currency: 'BTC',
  refreshSeconds: 60,
  minDte: 0,
  maxDte: 30,
  expiry: 'monthly',
  spotLookbackDays: 180,
  historyWindow: '30d',
  exposureConvention: 'assumption',
  flowWindow: '7d',
  tapeMinPremium: 0,
};
