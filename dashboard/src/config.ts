import { DEFAULT_THEME, type ThemeMode } from './theme/mode';
import type { ArchiveWindow, ExposureConvention, RecentWindow } from './types';
import { EXPIRY_ALL, type FrontExpiry } from './utils/expiry';

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

// DTE slider bound, covers the longest quoted chain
export const MAX_DTE_LIMIT = 365;

// the service caches one market state per currency for this long
// so a shorter poll period only re-serves the same snapshot
export const MIN_REFRESH_SECONDS = 10;

export const refreshMs = (seconds: number): number => Math.max(MIN_REFRESH_SECONDS, seconds) * 1000;

// Global preferences: set once, apply everywhere. Everything a chart can scope - expiry,
// DTE, window, lookback, sign convention, premium floor - lives per chart in ChartScope
// instead, so two charts can sit on different scopes and each keeps its own across reloads.
export interface Settings {
  currency: Currency;

  refreshSeconds: number;

  // which tenor the market strip's IV/RV pair and its per-expiry readouts follow
  stripTenor: FrontExpiry;

  theme: ThemeMode;
}

export const DEFAULT_SETTINGS: Settings = {
  currency: 'BTC',
  refreshSeconds: 60,
  stripTenor: 'monthly',
  theme: DEFAULT_THEME,
};

export interface ChartScope {
  // EXPIRY_ALL selects every expiry where a chart supports it, anything else is a
  // concrete ISO pick. The 'weekly'/'monthly' sentinels still resolve for stored blobs.
  expiry: string;

  minDte: number;
  maxDte: number;

  historyWindow: ArchiveWindow;

  exposureConvention: ExposureConvention;

  flowWindow: RecentWindow;

  // tape cutoff, in USD premium; 0 shows every print
  tapeMinPremium: number;
}

export const DEFAULT_SCOPE: ChartScope = {
  expiry: EXPIRY_ALL,
  minDte: 0,
  maxDte: 30,
  historyWindow: '30d',
  exposureConvention: 'assumption',
  flowWindow: '7d',
  tapeMinPremium: 0,
};
