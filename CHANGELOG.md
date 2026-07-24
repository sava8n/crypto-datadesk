# Changelog

## [0.0.2] - 2026-07-24

### Removed

- **COT report**

## [0.0.1] - 2026-07-18

Initial release.

### Added

- **Implied-volatility surface** — 3D IV surface over a delta-based moneyness axis and time to expiry, from the full Deribit chain.
- **Implied-volatility smile curves** — per-expiry IV smiles over strike, keeping the OTM leg so each forms a clean U-shape.
- **ATM term structure** — at-the-money IV per expiry, showing the slope of the vol curve (contango or backwardation).
- **25-delta skew** — risk-reversal (skew direction) and butterfly (wing richness) term structures.
- **Implied probability curves** — per-expiry probability of expiring above each strike, under the forward measure.
- **Implied settlement distribution** — histogram of the probability of settling in each strike bucket for a selected expiry.
- **Option greeks** — Black-76 delta, gamma, theta, and vega over strike for a selected expiry.
- **Annualized forward basis** — per-expiry forward premium or discount to spot.
- **Dealer gamma exposure (GEX)** — signed dollar gamma per strike with the net-GEX line and the zero-gamma flip.
- **Open interest by expiration** — stacked ITM/OTM call/put open interest per expiry, across the full chain.
- **Spot history** — daily candlestick chart annotated with options-derived levels (GEX flip, max pain, OI walls).
- **Traded volume by strike** — 24h call/put volume per strike, the flow companion to open interest.
- **Open interest by strike** — ITM/OTM call/put OI per strike with put/call ratio, notional and the max-pain price.
- **COT report** — weekly CFTC positioning for the currency's CME futures with net-flow, a rolling COT index and positioning history.
