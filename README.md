# Options Data

Options analytics for the BTC market based on real-time and historical data feeds.

![Dashboard](docs/dashboard.png)

## Features

- `iv-surface` — fetches the full BTC option chain from Deribit, parses each instrument's strike and expiry, and plots the implied-volatility surface in 3D over **deltas** and **time to expiry**. IV values come directly from Deribit's `mark_iv`.
- `iv-curves` — reuses the same BTC option chain and plots the implied-volatility **smile** as 2D line curves, one per **expiry**, over **strike**. Each curve keeps the out-of-the-money leg (puts below the forward, calls above), so every expiry forms a clean U-shape. IV values come directly from Deribit's `mark_iv`.
- `greeks` — computes the Black-76 option **greeks** (delta, gamma, theta, vega) for each contract in the OTM chain and plots each greek over **strike** for a selected **expiry** (picked from a dropdown). Uses the forward convention already used for the surface/curves (undiscounted, `r = 0`, σ = `mark_iv`). Conventions: delta is dimensionless, gamma is per **$1** forward move, vega is per **1 vol-point** (1%), theta is per **calendar day**.

## Quick start (Docker)

```sh
docker compose up --build
```

Then open **http://localhost:8080**.

## API

| Method | Path                            | Description             |
| ------ | ------------------------------- | ----------------------- |
| GET    | `/api/health`                   | Liveness probe          |
| GET    | `/api/summary?currency=BTC`     | Spot + chain size       |
| GET    | `/api/iv/surface?currency=BTC`  | IV surface              |
| GET    | `/api/iv/curves?currency=BTC`   | IV curves               |
| GET    | `/api/greeks/delta?currency=BTC`| Delta over strike       |
| GET    | `/api/greeks/gamma?currency=BTC`| Gamma over strike       |
| GET    | `/api/greeks/theta?currency=BTC`| Theta (per day)         |
| GET    | `/api/greeks/vega?currency=BTC` | Vega (per vol-point)    |

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
