# Crypto Signals MVP (Stripe + React + Docker)

Production-ready MVP for a crypto trading signals service.

## Stack
- Node.js (Express) + PostgreSQL
- Binance REST + WebSocket klines
- Telegram Bot (public/private channel messages)
- Stripe Checkout (monthly subscription)
- React + Vite landing page
- Dockerfile (multi-stage build)

## Quick Start (Local)

1) Install root server deps
```bash
npm install
```

2) Install and build client
```bash
cd client
npm install
npm run build
cd ..
```

3) Copy client build to `public/` (skip if you will use Docker which does it automatically)
```bash
cp -r client/dist/* public/
```

4) Create `.env` from example and fill values
```bash
cp .env.example .env
```

### Binance Futures Testnet
To enable testnet account and order endpoints, set the following variables in `.env`:

```
BINANCE_BASE_URL=https://testnet.binancefuture.com
BINANCE_API_KEY=your_key
BINANCE_API_SECRET=your_secret
BINANCE_RECV_WINDOW=5000
```

5) Init DB
```bash
npm run initdb
```

6) Run live engine (Binance + Telegram notifications)
```bash
npm run live
```

7) Run API / Web server (serves React build from /public)
```bash
npm run dev
# http://localhost:3000/
# http://localhost:3000/health
# http://localhost:3000/signals/latest
```

## Stripe (test mode)
- Create a product with recurring monthly price in Stripe Dashboard.
- Put the `STRIPE_PRICE_ID` into `.env` (e.g., price_12345).
- Use `STRIPE_SECRET_KEY` (starts with `sk_test_...`).
- Set `PUBLIC_URL` to your server URL (e.g., http://localhost:3000).
- Add endpoint `/webhook/stripe` to Stripe webhooks with events: `checkout.session.completed`.

The landing's "Subscribe" button calls `/api/checkout-session` and redirects to Stripe Checkout.

## Docker
Build and run:
```bash
docker build -t crypto-signals .
docker run --env-file .env -p 3000:3000 crypto-signals
```

Or via docker-compose:
```bash
docker compose up --build
```

## Observability & Monitoring

Set `OBSERVABILITY_ENABLED=true` to enable OpenTelemetry tracing and metrics. Configure OTLP endpoint via `OTEL_EXPORTER_OTLP_ENDPOINT`, optional headers with `OTEL_EXPORTER_OTLP_HEADERS` and sampling ratio with `OTEL_SAMPLER_RATIO` (e.g. `0.1`).

Logs are emitted in JSON via [pino](https://getpino.io/). Each request log includes fields such as `ts`, `reqId`, `method`, `path`, `status`, `dur_ms`, `ua`, `ip`, `trace_id` and `span_id`.

Custom metrics exported:

- `jobs.queue.size` – current jobs waiting in the queue
- `jobs.queue.oldest_age_ms` – age of the oldest queued job
- `runner.trades.executed` – counter of executed trades

### GCP Monitoring

- **Uptime check:** `GET /healthz` every minute (region EU)
- **Alert policies:**
  - Error rate: 5xx / all requests ≥ 2% (5 min window)
  - Latency p95 > 1000ms for 5 min
  - Risk halted: `risk_state.state == 'HALTED'` for >15 min (metric or log-based)
  - Jobs backlog: `jobs.queue.oldest_age_ms` > 15 min

## Disclaimer
Educational purposes only. No financial advice.
