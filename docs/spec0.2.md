# Project Specification

## Executive summary
- Node.js 20 service delivers crypto trading signals and analytics.
- Express API integrates Binance, Stripe, and Telegram features.
- PostgreSQL stores jobs, overlays, equity snapshots, and strategy configs.
- React/Vite client serves analytics, portfolio, and live trading pages.
- Dockerfile builds runtime image exposing port 3000.
- docker-compose stack adds Postgres, OTEL collector, Loki, Prometheus, Alertmanager, and Grafana.
- Environment samples configure Binance testnet, Telegram, Stripe keys, and SLO targets.
- Metrics endpoint and SSE events enable runtime monitoring.
- Job scripts cover backtesting, optimization, signal generation, and live trading.
- JWT auth middleware protects critical routes.
- GAPS/TBD: production deployment details beyond docker-compose.

## Architecture overview
- Express server (`src/server.js`) orchestrates API, jobs, and live trading.
- PostgreSQL database accessed via SQL migrations.
- External integrations: Binance REST/WebSocket, Stripe checkout, Telegram bot.
- OTEL instrumentation exports traces, metrics, and logs.
- Job/engine scripts execute backtesting, optimization, and live trading workflows.
- Static client assets served alongside API.

## Codebase layout
- `src/` for routes, integrations, jobs, observability, and storage.
- `migrations/` holds database schema changes V001–V017.
- `client/` contains React frontend with Vite config.
- `deploy/` houses Docker Compose files, Prometheus/Grafana/Alertmanager/Loki configs, and OTEL collector.
- `scripts/` provides automation like backtest, fetch-binance, optimize, signals, and walkforward.
- GAPS/TBD: complete directory breakdown for all subtrees.

## Runtime & operations
- Run with `npm start` or `npm run dev` for OTEL-instrumented development.
- Docker runtime based on `node:20-alpine` exposing port 3000.
- `docker-compose.observability.yml` adds Postgres (5432), OTEL (4317/4318), Loki (3100), Prometheus (9090), Alertmanager (9093), and Grafana (3001).
- `.env.example` outlines PORT, DATABASE_URL, Binance settings, Telegram tokens, Stripe keys, SLO targets, and artifacts path.
- Caddyfile reverse proxies app:3000 (GAPS/TBD for production HTTPS setup).
- GAPS/TBD: Kubernetes deployment specifics.

## Data model
- SQL migrations define tables for jobs, live equity snapshots, overlay sets, overlay shares, analytics performance indexes, strategy configs, plan vs actual, job runner, guardrails, equity history, candles, signals, subscribers, and paper trades.
- Risk tables include `risk_limits`, `risk_state`, and `risk_halts` with circuit breaker settings and halting logs.
- Indices support fast filters on timestamps, status, symbol, strategy, and JSONB parameters.
- GAPS/TBD: detailed entity relationships and field descriptions.

## APIs & interfaces
- Core endpoints: `/api/ping`, `/metrics`, `/events` (SSE), `/healthz`, `/readyz`.
- Binance routes under `/binance` for account, orders, positions, and user data streams.
- Analytics routes provide overlays, overlay sets, jobs, reports, and artifact downloads.
- Job management via `/jobs` with create, cancel, logs, and stream endpoints.
- Live trading endpoints manage state, config, history, and trades.
- Configuration endpoints for strategies and presets; risk endpoints for status, config, halt, resume, and logs.
- Portfolio endpoints cover holdings, correlation, and attribution.
- Payment and invite endpoints: `/webhook/stripe`, `/api/checkout-session`, `/api/telegram-invite`.
- GAPS/TBD: versioning and authentication details per route.

## Frontend
- React/Vite client served from `client/` with routes for home and analytics.
- Static pages in `public/`: `index.html`, `analytics.html`, `portfolio.html`, `live.html`, `jobs.html`, `health.html`.
- Stripe checkout and Telegram invite scripts embedded in client pages.
- GAPS/TBD: comprehensive description of frontend components and state management.

## Observability
- `/metrics` exposes Prometheus metrics including job queue gauges and RUM stats.
- OpenTelemetry collector exports traces, metrics, and logs to Prometheus, Loki, and other backends.
- Docker Compose provisions Prometheus, Alertmanager, Grafana dashboards, and Loki for logs.
- RUM script (`assets/obs/rum.js`) posts client metrics to `/rum/metrics`.
- GAPS/TBD: alerting rules coverage and dashboard inventory.

## Security & compliance
- JWT auth middleware secures live trading, risk, and job endpoints.
- `.env.example` highlights secrets for Binance, Telegram, Stripe, and database connection.
- Alertmanager configured with Telegram receiver for incident notifications.
- GAPS/TBD: formal compliance, TLS, and secret rotation processes.

## Testing & QA
- Jest test suites for server and client (`jest.config.js`, `jest.client.config.cjs`).
- Playwright end-to-end tests via `playwright.config.ts`.
- GitHub Actions `ci.yml` uploads Playwright reports.
- NPM scripts offer coverage runs and quick client tests.
- GAPS/TBD: integration test coverage for external services.

## Backlog: Gaps & Recommendations
- Expand data model documentation and ER diagrams.
- Harden production deployment with Kubernetes manifests and HTTPS.
- Improve frontend documentation and state management guidelines.
- Define security compliance and secret management procedures.
- Enhance integration tests for Binance, Stripe, and Telegram flows.

## Appendix
- See [`artifacts/repo-survey.md`](../artifacts/repo-survey.md) for full survey data.
