import type { GexConvention, OIChangeWindow } from './types';
import type { FrontExpiry } from './utils/expiry';

export const CURRENCIES = ['BTC'] as const;

export type Currency = (typeof CURRENCIES)[number];

// preset lookback windows for the history panels
export const LOOKBACKS = [7, 30, 90, 365] as const;

export type LookbackDays = (typeof LOOKBACKS)[number];

// the service caches one market state per currency for this long
// so a shorter poll period only re-serves the same snapshot
export const MIN_REFRESH_SECONDS = 10;

// poll period in ms, clamped to the service cache floor
export const refreshMs = (seconds: number): number =>
  Math.max(MIN_REFRESH_SECONDS, seconds) * 1000;

// user-tunable inputs
// the settings drawer overrides these and persists the overrides to localStorage
export interface Settings {
  // currency book shown on load
  currency: Currency;

  // seconds between polls
  refreshSeconds: number;

  // DTE window
  // near-dated expiries out to the front month
  minDte: number;
  maxDte: number;

  // nearest weekly/monthly expiry
  frontExpiry: FrontExpiry;

  // spot chart initial visible window, days of daily candles
  spotLookbackDays: number;

  // panel defaults; each section seeds its own control from these and keeps
  // the override until the default moves again

  // history panels' archive window
  historyLookbackDays: LookbackDays;

  // how dealer inventory is signed on the exposure panels
  gexConvention: GexConvention;

  // archived baseline the flow and OI-change panels diff against
  flowWindow: OIChangeWindow;

  // tape cutoff, in USD premium; 0 shows every print
  tapeMinPremium: number;
}

export const DEFAULT_SETTINGS: Settings = {
  currency: 'BTC',
  refreshSeconds: 60,
  minDte: 0,
  maxDte: 30,
  frontExpiry: 'monthly',
  spotLookbackDays: 180,
  historyLookbackDays: 30,
  gexConvention: 'assumption',
  flowWindow: '7d',
  tapeMinPremium: 0,
};
