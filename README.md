# Options Data

Options analytics for the BTC market based on real-time and historical data feeds.

![Dashboard](docs/dashboard.png)

## Features

- `iv-surface` — fetches the full BTC option chain from Deribit, parses each instrument's strike and expiry, and plots the implied-volatility surface in 3D over a **delta-based moneyness axis** and **time to expiry**. The axis is strike-monotonic — put wing on the left, ATM at the centre, call wing on the right (`10p … 25p … ATM … 25c … 10c`) — so each expiry's smile reads left-to-right in strike. IV values come directly from Deribit's `mark_iv`.
- `iv-curves` — reuses the same BTC option chain and plots the implied-volatility **smile** as 2D line curves, one per **expiry**, over **strike**. Each curve keeps the out-of-the-money leg (puts below the forward, calls above), so every expiry forms a clean U-shape. IV values come directly from Deribit's `mark_iv`.
- `term-structure` — plots the **ATM implied-volatility term structure** as a 2D line: one at-the-money IV point per **expiry**, spaced time-proportionally by **days to expiry**. The ATM IV is interpolated from each expiry's OTM smile to the forward (log-moneyness `ln(K/F) = 0`), revealing whether the vol market is in contango (upward) or backwardation (downward).
- `greeks` — computes the Black-76 option **greeks** (delta, gamma, theta, vega) for each contract in the OTM chain and plots each greek over **strike** for a selected **expiry**. Uses the forward convention already used for the surface/curves (undiscounted, `r = 0`, σ = `mark_iv`). Conventions: delta is dimensionless, gamma is per **$1** forward move, vega is per **1 vol-point** (1%), theta is per **calendar day**.
- `oi-by-expiration` — plots **open interest by expiration** as one stacked bar per **expiry**, split into **ITM/OTM calls and puts**. Unlike the IV/greeks views it uses the _full_ chain (every strike and expiry, dailies through LEAPS) and sums Deribit's per-contract `open_interest` (in **contracts**). Moneyness is classified by **strike vs the per-contract forward** (call ITM when `strike < forward`, put ITM when `strike > forward`) — no IV needed, so deep-ITM and illiquid but OI-heavy contracts are kept.
- `oi-by-strike` — plots **open interest by strike** as grouped **ITM/OTM call/put** bars (same full chain and moneyness rule as `oi-by-expiration`), with an **All Expirations** filter. A summary row reports **call/put/total OI**, the **put/call ratio**, and **notional value** (`total OI × spot`). When a single **expiry** is selected it also overlays each strike's **total intrinsic value** (`Σ callOI·max(K−Kᵢ,0) + Σ putOI·max(Kᵢ−K,0)`, in USD) and marks the **max-pain price** — the strike that minimises it.

## Quick start (Docker)

```sh
docker compose up --build
```

Then open **http://localhost:8080**.

## API

| Method | Path                                        | Description                          |
| ------ | ------------------------------------------- | ------------------------------------ |
| GET    | `/api/health`                               | Liveness probe                       |
| GET    | `/api/spot?currency=BTC`                    | Spot price                           |
| GET    | `/api/iv/surface?currency=BTC`              | IV surface                           |
| GET    | `/api/iv/curves?currency=BTC`               | IV curves                            |
| GET    | `/api/iv/term-structure?currency=BTC`       | ATM IV term structure                |
| GET    | `/api/greeks/chain?currency=BTC`            | Delta/gamma/theta/vega per contract  |
| GET    | `/api/oi/expiration?currency=BTC`           | Open interest by expiry              |
| GET    | `/api/oi/strike?currency=BTC[&expiry=…]`    | Open interest by strike (+ max pain) |

> Note: API docs are available at http://localhost:8000/docs.

## Local development

Service:

```sh
cd core
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:server --reload # serves http://localhost:8000
```

Dashboard:

```sh
cd dashboard
npm install
npm run dev # serves http://localhost:5173, proxies /api -> :8000
```
