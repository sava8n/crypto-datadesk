import { DEFAULT_THEME, type ThemeMode } from './theme/mode';
import type { ArchiveWindow, ExposureConvention, RecentWindow } from './types';
import { EXPIRY_ALL, type FrontExpiry } from './utils/expiry';

export const CURRENCIES = ['BTC'] as const;

export type Currency = (typeof CURRENCIES)[number];

export const ARCHIVE_WINDOWS: readonly ArchiveWindow[] = ['7d', '30d', '90d', '1y'];

export const RECENT_WINDOWS: readonly { value: RecentWindow; label: string }[] = [
  { value: '24h', label: '24H' },
  { value: '7d', label: '7D' },
];

export const CONVENTIONS: readonly { value: ExposureConvention; label: string }[] = [
  { value: 'assumption', label: 'ASSUMED' },
  { value: 'flow', label: 'FLOW' },
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

  historyWindow: ArchiveWindow;

  exposureConvention: ExposureConvention;

  flowWindow: RecentWindow;

  // USD premium; 0 shows every print
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
