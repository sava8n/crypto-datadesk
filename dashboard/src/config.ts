import { DEFAULT_THEME, type ThemeMode } from './theme/mode';
import type { ArchiveWindow, RecentWindow, Resolution } from './types';
import { EXPIRY_ALL, type FrontExpiry } from './utils/expiry';

export const CURRENCIES = ['BTC'] as const;

export type Currency = (typeof CURRENCIES)[number];

// the history charts load the whole archive at capture resolution; the slider picks the span
export const HISTORY_WINDOW: ArchiveWindow = '1y';
export const HISTORY_RESOLUTION: Resolution = '1h';

export const RECENT_WINDOWS: readonly { value: RecentWindow; label: string }[] = [
  { value: '24h', label: '24H' },
  { value: '7d', label: '7D' },
];

// percent band around spot kept on the strike charts
export type StrikeRange = '10' | '25' | '50' | 'all';

export const STRIKE_RANGES: readonly { value: StrikeRange; label: string }[] = [
  { value: '10', label: '±10%' },
  { value: '25', label: '±25%' },
  { value: '50', label: '±50%' },
  { value: 'all', label: 'ALL' },
];

// longest quoted chain
export const MAX_DTE_LIMIT = 365;

// the service caches market state per currency for this long; polling faster re-serves it
export const MIN_REFRESH_SECONDS = 10;

export const refreshMs = (seconds: number): number => Math.max(MIN_REFRESH_SECONDS, seconds) * 1000;

export interface Settings {
  currency: Currency;

  refreshSeconds: number;

  // tenor the market strip follows
  stripTenor: FrontExpiry;

  theme: ThemeMode;
}

export const DEFAULT_SETTINGS: Settings = {
  currency: 'BTC',
  refreshSeconds: 60,
  stripTenor: 'weekly',
  theme: DEFAULT_THEME,
};

export interface ChartScope {
  // 'weekly'/'monthly' still resolve for stored blobs
  expiry: string;

  minDte: number;
  maxDte: number;

  flowWindow: RecentWindow;

  // USD premium; 0 shows every print
  tapeMinPremium: number;

  strikeRange: StrikeRange;
}

export const DEFAULT_SCOPE: ChartScope = {
  expiry: EXPIRY_ALL,
  minDte: 0,
  maxDte: 30,
  flowWindow: '7d',
  tapeMinPremium: 0,
  strikeRange: 'all',
};
