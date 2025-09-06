# Project Specification

## Executive summary
- Node.js 20 service providing crypto trading signals and analytics.
- Express API integrates Binance, Stripe and Telegram features.
- PostgreSQL stores jobs, overlays, equity snapshots and strategy configs.
- React/Vite client serves analytics and live trading pages.
- Observability stack includes OpenTelemetry, Prometheus, Grafana and Loki.
- Dockerfile builds production image exposing port 3000.
- Environment configuration covers Binance testnet, Telegram, Stripe and SLO targets.
- GitHub Actions handle scaffold and deployment workflows.
- Job scripts cover backtesting, optimization, signal generation and live trading.
- Metrics endpoint and health checks enable runtime monitoring.
- Stripe webhook endpoint supports subscription checkout.
- JWT auth protects live trading, risk and job management endpoints.
- GAPS: detailed data model docs and client production readiness.

## Architecture overview
- Express server (`src/server.js`) as core service.
- PostgreSQL database accessed via migrations and storage modules.
- External services: Binance REST, Stripe checkout, Telegram bot.
- Job/engine scripts execute backtesting and live trading workflows.
- Static client assets served alongside API.

## Codebase layout
- `src/` for server routes, integrations and observability.
- `migrations/` and `src/storage/migrations` hold SQL schema changes.
- `client/` contains React frontend and static assets.
- `deploy/` houses Docker Compose, prom/grafana configs.
- `scripts/` provides automation like backtest, fetch-binance, optimize.
- GAPS: full top-level tree not captured.

## Runtime & operations
- Run with `npm start` or `npm run dev` for OTEL instrumentation.
- Dockerfile based on `node:20-alpine`; exposes port 3000.
- `deploy/docker-compose.observability.yml` adds Postgres, otel-collector, Loki, Prometheus, Grafana, Alertmanager.
- `.env.example` defines PORT, DATABASE_URL, Binance, Telegram, Stripe keys and SLO targets.
- Common ports: 3000 (app), 5432 (Postgres), 4317/4318 (OTLP), 3100 (Loki), 9090 (Prometheus), 9093 (Alertmanager), 3001 (Grafana).
- Caddyfile reverse proxies app:3000.
- GAPS: production deployment details beyond docker-compose.

## Data model
- Migrations define enums `job_type`, `job_status` and tables like `jobs`, `equity_snapshots`, `overlay_sets`, `overlay_shares`.
- Additional tables: `positions`, `paper_trades`, `strategy_configs`, `strategy_presets`.
- Base schema includes `candles`, `signals`, `subscribers`, `paper_state`.
- Indexes exist for performance (e.g., `idx_equity_snapshots_source_ts`).
- GAPS: relationships, constraints and retention policies.

## APIs & interfaces
- Health routes: `/healthz`, `/readyz`, `/health`, `/health/ingest`.
- Metrics at `/metrics`.
- Job management: `/jobs`, `/jobs/:id`, `/jobs/:id/cancel`, `/jobs/stream`.
- Analytics & overlays: `/analytics/overlay/:id`, `/analytics/overlay-sets`, CSV & report endpoints.
- Config endpoints: `/config/strategies`, `/config/presets` and runner status.
- Live trading: `/live`, `/live/start`, `/live/stop`, `/live/equity`, `/live/equity-stream`, `/live/config`.
- Risk management: `/risk/status`, `/risk/config`, `/risk/halt`, `/risk/resume`.
- Payments & invites: `/api/checkout-session`, `/api/telegram-invite`, `/webhook/stripe`.
- Binance integration routes (`/binance/*`).
- SSE stream at `/events`.

## Frontend
- React application defined in `client/package.json` using `@vitejs/plugin-react` and `react-router-dom`.
- Static assets include `analytics.html`, `live.html`, `health.html` built via `npm run build:client`.
- Client page scripts such as `client/public/assets/analytics.js` initialize charts.
- GAPS: routing map and component hierarchy.

## Observability
- OpenTelemetry SDK and auto-instrumentations with export to OTLP.
- `/metrics` endpoint exposes Prometheus metrics; custom metrics like `jobs.queue.size`.
- Docker-compose sets up otel-collector, Loki for logs, Prometheus with alert rules, Grafana dashboards, Alertmanager.
- RUM script `assets/obs/rum.js` posts metrics to `/rum/metrics`.
- SLO targets via env vars (e.g., `SLO_API_AVAIL`).

## Security & compliance
- Secrets injected via `.env` and `deploy/.env.example` (API keys, tokens, database creds).
- Caddy reverse proxy can provide HTTPS.
- JWT-based authentication with shared secret protects `/live`, `/risk/*` and `/jobs/*` routes.
- GAPS: logging of sensitive data, compliance standards, license information.

## Testing & QA
- NPM scripts for Jest unit tests (`test`, `test:client`, coverage) and Playwright e2e tests (`e2e`).
- `scripts/smoke-observ.js` and `tests/k6/http-smoke.js` for smoke tests.
- GitHub Actions workflow stores Playwright report artifact.
- GAPS: test coverage thresholds and CI status for all environments.

## Backlog: Gaps & Recommendations
- Expand data model documentation and ER diagrams.
- Clarify production deployment process and scaling.
- Improve frontend documentation and component testing.
- Review security practices and licensing.

## Appendix
- Generated from [`artifacts/repo-survey.md`](../artifacts/repo-survey.md).
