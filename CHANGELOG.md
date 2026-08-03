# Changelog

## [0.3.1] - 2026-08-04

### Added

- **Expected-move cone** - the implied p16/p50/p84 of the front expiry projected forward from the last candle, drift compounding linearly in time and dispersion as the square root, so the near end collapses to spot and the far end reproduces the chain's own quantiles
- **7-day implied vs realized vol** - `iv7` and `rv7` on the stats route

### Changed

- **Panel defaults in settings** - history lookback, dealer-inventory sign, flow window and tape minimum premium are now configurable
- **Market chart levels** - GEX flip, max pain, call/put OI walls and the clustered GEX support/resistance lines removed


## [0.3.0] - 2026-08-03

### Added

- **Trade tape** - every option print archived with its taker side, polled each minute
- **Flow views** - net taker flow by strike and by expiration plus the raw tape, on a new FLOW tab
- **Flow-signed dealer inventory** - GEX and vanna/charm panels can sign OI by cumulative taker flow instead of the classic calls+/puts- assumption, blending per contract where the tape only partly covers standing OI
- **Coverage signals** - flow panels label windows truncated by tape depth; OI change and smile compare flag a stale archive baseline

### Changed

- **Layout** - traded volume moved to FLOW

## [0.2.0] - 2026-08-02

### Added

- **History views** - archived vol, skew, open-interest and GEX/levels series with a new HISTORY tab
- **Open interest change** - per-strike OI delta against the archive over a 24h/7d window
- **Realized-vol cone** - rolling RV percentiles per window with the implied term structure overlaid
- **IV percentile** - true trailing-year percentile of 30d ATM IV in the header once enough history accrues
- **Percentile bands** - constant-maturity tenor grid archived per snapshot, with 90-day p25-p75 bands on the term-structure and skew panels
- **Smile compare** - the current smile against the archived one from 24h/7d ago
- **Vol risk premium** - IV30 against the realized vol observed 30 days later
- **Vanna/charm exposure** - dealer exposure by strike for the higher-order greeks
- **Expiries table** - max pain and the implied ±1σ move per expiry

### Changed

- **Layout** - CHAIN tab retired: basis moved to VOLATILITY; the per-strike greek panels and the 3D IV surface are unmounted (kept in the codebase as deprecated)

## [0.1.1] - 2026-08-01

### Added

- **Auto-refresh** with non-disruptive updates

## [0.1.0] - 2026-07-27

### Added

- **Market snapshots persistence**

## [0.0.2] - 2026-07-24

### Removed

- **COT report**

## [0.0.1] - 2026-07-18

Initial release.

### Added

- **Implied-volatility surface** - 3D IV surface over a delta-based moneyness axis and time to expiry, from the full Deribit chain
- **Implied-volatility smile curves** - per-expiry IV smiles over strike, keeping the OTM leg so each forms a clean U-shape
- **ATM term structure** - at-the-money IV per expiry, showing the slope of the vol curve (contango or backwardation)
- **25-delta skew** - risk-reversal (skew direction) and butterfly (wing richness) term structures
- **Implied probability curves** - per-expiry probability of expiring above each strike, under the forward measure
- **Implied settlement distribution** - histogram of the probability of settling in each strike bucket for a selected expiry
- **Option greeks** - Black-76 delta, gamma, theta, and vega over strike for a selected expiry
- **Annualized forward basis** - per-expiry forward premium or discount to spot
- **Dealer gamma exposure (GEX)** - signed dollar gamma per strike with the net-GEX line and the zero-gamma flip
- **Open interest by expiration** - stacked ITM/OTM call/put open interest per expiry, across the full chain
- **Spot history** - daily candlestick chart annotated with options-derived levels (GEX flip, max pain, OI walls)
- **Traded volume by strike** - 24h call/put volume per strike, the flow companion to open interest
- **Open interest by strike** - ITM/OTM call/put OI per strike with put/call ratio, notional and the max-pain price
- **COT report** - weekly CFTC positioning for the currency's CME futures with net-flow, a rolling COT index and positioning history
