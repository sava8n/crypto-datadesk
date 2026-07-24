import type { FrontExpiry } from './utils/expiry';

export const CURRENCIES = ['BTC'];

// user-tunable inputs
// the settings drawer overrides these and persists the overrides to localStorage
export interface Settings {
  // currency book shown on load
  currency: string;

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
