# Project Specification v0.3

## Executive summary
- Node.js 20 Express service delivers crypto trading signals and analytics.
- PostgreSQL backend stores jobs, overlays, positions, and risk state.
- Integrations include Binance REST/WebSocket, Stripe Checkout, and Telegram bots.
- Dockerfile builds production image exposing port 3000 with multi-stage install.
- Docker Compose stack adds Postgres, OTEL Collector, Loki, Prometheus, Alertmanager, and Grafana.
- Config samples define PORT, DATABASE_URL, Binance URLs, Telegram tokens, and Stripe keys.
- API surface spans analytics, jobs, live trading, configuration, risk, and payment webhooks.
- `/metrics` and `/events` endpoints provide Prometheus metrics and SSE streams for runtime insight.
- K8s manifests exist for API, Prometheus, Loki, Grafana, and OTEL components.
- NPM scripts and GitHub Actions cover testing, e2e, analytics cron, and scaffold workflows.
- Frontend React/Vite client renders Home, Backtests, and Analytics routes with Chart.js.
- GAPS/TBD: production HTTPS setup, deployment automation, and comprehensive security hardening.

## Architecture overview
- Express server (`src/server.js`) orchestrates API routes, jobs, live trading, and third‑party hooks.
- PostgreSQL schema managed via numbered migrations (`migrations/V001__…V017__`).
- External services: Binance REST/WebSocket, Stripe webhook, Telegram channels.
- OTEL instrumentation exports to Prometheus, Loki, and Grafana for observability.
- K8s manifests deploy API and monitoring stack; Docker Compose facilitates local dev.
- GAPS/TBD: detailed service interactions and scaling strategy.

## Codebase layout
- `src/` – routes (analytics, jobs, risk, live), integrations, observability, storage.
- `client/` – React app with `App.jsx`, `pages/Home.jsx`, and assets under `public/`.
- `migrations/` – SQL files V001–V017 defining tables like jobs, overlays, risk limits, and equity history.
- `deploy/` – Docker Compose files, Prometheus/Alertmanager/Loki configs, OTEL collector, Caddyfile, and k8s manifests.
- `scripts/` – automation scripts including `fetch-binance.js` and backtesting helpers.
- `docs/` – auth, deploy, observability, security, SLOs, ER diagram, prior specs.
- GAPS/TBD: exhaustive listing for `tests/`, `tools/`, and nested client modules.

## Runtime & operations
- Node runtime exposes port 3000; environment samples map Postgres on 5432 and monitoring ports 9090/9093/3001.
- `docker-compose.observability.yml` runs Postgres, OTEL Collector (4317/4318), Loki (3100), Prometheus, Alertmanager, and Grafana.
- K8s manifests provision API, Loki, Prometheus, Grafana, and OTEL Collector deployments with persistent volumes.
- `.env.example` documents variables for port, database URL, Binance base URL, Telegram tokens, Stripe keys, and SLO targets.
- NPM scripts like `stack:up`, `prom:check`, `test`, `e2e`, and `fetch:binance` aid operations.
- GAPS/TBD: scaling, backup, and disaster recovery procedures.

## Data model
- Tables include jobs, equity_snapshots, overlay_sets, overlay_shares, positions, strategy_configs, strategy_presets, trade_fills, job_artifacts, job_logs, risk_limits, risk_state, risk_halts, and equity_history.
- Schema files add price candles, signals, subscribers, and extended paper_trades with status, entry/exit prices, and risk fields.
- Indices on timestamps, status, symbol, and JSON fields support analytics and live queries.
- GAPS/TBD: full ER diagram relationships and field constraints.

## APIs & interfaces
- Core endpoints: `/api/ping`, `/metrics`, `/events`, `/healthz`, `/readyz`.
- Binance integration routes: `/binance/ping`, `/account`, `/open-orders`, `/positions`, `/order`, `/user-data/*`.
- Analytics endpoints for overlays, overlay sets, jobs, reports, artifact download, and CSV export.
- Job management via `/jobs` create, cancel, logs, stream, and artifact retrieval.
- Live trading endpoints: `/live`, `/live/start`, `/live/stop`, `/live/trades`, `/live/config`, `/live/history`, `/signals/latest`.
- Configuration routes manage strategies and presets; risk routes handle status, config, halt/resume, and logs.
- Payment and invite routes: `/webhook/stripe`, `/api/checkout-session`, `/api/telegram-invite`.
- GAPS/TBD: versioning, authentication per endpoint, and rate limiting.

## Frontend
- React/Vite client uses React Router with routes for Home, Backtests, Analytics, and wildcard redirects.
- Client modules render charts using Chart.js for equity, portfolio allocation, attribution, and risk.
- Static `public` folder ships `analytics.html`, `portfolio.html`, and bundled JS assets.
- Stripe client SDK and Telegram invite fetches integrated into Home page.
- Playwright reports and `client/assets` provide built artifacts and analytics modules.
- GAPS/TBD: state management patterns, responsiveness, and accessibility coverage.

## Observability
- `/metrics` exposes Prometheus metrics; `/events` streams server-sent events.
- Docker Compose and K8s include Prometheus, Alertmanager, Loki, Grafana, and OTEL Collector.
- Prometheus rules/alerts and Grafana provisioning directories exist under `deploy/`.
- Scripts and docs offer `prom:check`, `stack:logs`, and RUM `assets/obs/rum.js` for client metrics.
- GAPS/TBD: complete dashboard catalog and alert escalation policies.

## Security & compliance
- JWT auth middleware protects critical live trading and job endpoints.
- `.env.example` highlights secrets for database, Binance, Telegram, and Stripe.
- Alertmanager config includes Telegram receivers for incident notifications.
- GAPS/TBD: TLS termination, secret rotation, and compliance standards (e.g., GDPR, SOC2).

## Testing & QA
- Jest configuration for server and client (`jest.config.js`, `jest.client.config.cjs`, `jest.setup.cjs`).
- Playwright end-to-end tests via `playwright.config.ts` with accessibility tooling (`@axe-core/playwright`).
- GitHub Actions `ci.yml` uploads Playwright reports; additional workflow `analytics-cron.yml` handles scheduled jobs.
- NPM scripts provide coverage, watch mode, e2e installs, and quick client tests.
- GAPS/TBD: integration testing coverage for external APIs and load testing.

## Backlog: Gaps & Recommendations
- Harden deployment with production TLS, Kubernetes automation, and secret management.
- Expand data model documentation and ER diagrams.
- Strengthen authentication, authorization, and compliance processes.
- Improve frontend state management docs and accessibility testing.
- Increase integration test coverage for Binance, Stripe, and Telegram flows.

## Appendix
- See [`artifacts/repo-survey.md`](../artifacts/repo-survey.md) for full repository survey.
