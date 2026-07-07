import type { GEXByStrikeResponse, OIByStrikeResponse } from '../../types';
import { expiryLabel, oiFmt } from '../../utils/format';

export interface PriceLevel {
  price: number;
  title: string;
  color: string;
}

const FLIP = '#ff3b30';
const MAX_PAIN = '#b06cf0';
const WALL = '#a97400';

const WALL_COUNT = 3;
const RANGE = 0.3; // levels beyond ±30% of spot are off-chart noise

// Deribit monthlies settle on the last Friday of a month
function isMonthly(iso: string): boolean {
  const d = new Date(iso);
  if (d.getUTCDay() !== 5) return false;
  return new Date(d.getTime() + 7 * 86_400_000).getUTCMonth() !== d.getUTCMonth();
}

export function frontMonthlyExpiry(expiries: string[]): string | undefined {
  return expiries.find(isMonthly) ?? expiries[0];
}

// options-derived levels for the market strip:
// - GEX flip
// - front-month max pain
// - the biggest all-expiration OI strikes (walls)
export function buildLevels(
  gex: GEXByStrikeResponse | undefined,
  oiAll: OIByStrikeResponse | undefined,
  oiFront: OIByStrikeResponse | undefined,
): PriceLevel[] {
  const spot = gex?.spot ?? oiAll?.spot;
  const inRange = (p: number) => spot != null && Math.abs(p / spot - 1) <= RANGE;

  const levels: PriceLevel[] = [];

  if (gex?.flip != null && inRange(gex.flip)) {
    levels.push({ price: gex.flip, title: 'GEX FLIP', color: FLIP });
  }

  if (oiFront?.max_pain != null && oiFront.expiry != null && inRange(oiFront.max_pain)) {
    levels.push({
      price: oiFront.max_pain,
      title: `MAX PAIN ${expiryLabel(oiFront.expiry)}`,
      color: MAX_PAIN,
    });
  }

  if (oiAll) {
    const walls = oiAll.points
      .map((p) => ({
        strike: p.strike,
        oi: p.itm_calls + p.otm_calls + p.itm_puts + p.otm_puts,
      }))
      .filter((w) => inRange(w.strike))
      .sort((a, b) => b.oi - a.oi)
      .slice(0, WALL_COUNT);
    for (const w of walls) {
      levels.push({ price: w.strike, title: `OI ${oiFmt(w.oi)}`, color: WALL });
    }
  }

  return levels;
}
