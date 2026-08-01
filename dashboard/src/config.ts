import type { FrontExpiry } from './utils/expiry';

export const CURRENCIES = ['BTC'] as const;

export type Currency = (typeof CURRENCIES)[number];

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

  // spot chart levels
  levels: {
    range: number; // levels beyond ±this of spot are off-chart noise
    tolerance: number; // coincident levels within this distance collapse, in units
    gexClusterMinWeight: number; // a neighbor counts as stacked at >= this fraction of the max weight
    gexClusterMaxGap: number; // max stacked-neighbor gap, in units of the median grid step
  };
}

export const DEFAULT_SETTINGS: Settings = {
  currency: 'BTC',
  refreshSeconds: 60,
  minDte: 0,
  maxDte: 30,
  frontExpiry: 'weekly',
  spotLookbackDays: 180,
  levels: {
    range: 0.3,
    tolerance: 100,
    gexClusterMinWeight: 0.5,
    gexClusterMaxGap: 1.5,
  },
};
