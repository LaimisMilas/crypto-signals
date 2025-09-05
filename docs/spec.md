# Project Specification (Discovery Draft)

## Executive Summary
- Purpose: MVP for crypto trading signals service integrating Binance, Telegram alerts, and Stripe subscriptions.
- Key components/services: Node.js Express API, job runner/backtesting engine, React client, observability stack (Prometheus, Loki, Grafana, OTEL).
- Tech stack: Node.js, Express, PostgreSQL, React/Vite, Stripe, Telegram Bot API, Docker, GitHub Actions.
- Data storage: PostgreSQL with migrations for jobs, positions, overlays, paper trades, strategy configs.
- Deployment targets: Docker Compose, Google Cloud Run via GitHub Actions.
- Observability: OpenTelemetry metrics/trace, Prometheus alerts, Grafana dashboards.
- Security (at-a-glance): Secrets via .env, token redaction in logs, HTTPS via Caddy.
- Major gaps/TBD: detailed data model coverage, auth flows, production readiness of client.
- Next steps (1–2 savaičių planas): document DB relations, add auth strategy, extend tests, refine deployment docs.

## 1. Scope & Goals
- What problem is solved? Provides crypto trading signals service with subscriptions and analytics.
- In/Out of scope: In scope – signal generation, backtesting, live trading integration, analytics UI. Out of scope – advanced authentication, multi-exchange support (TBD).

## 2. Architecture Overview
- High-level schema (tekstinis aprašas): Client requests hit Express API; API interacts with PostgreSQL and external services (Binance, Stripe, Telegram). Jobs/engines process data; observability services collect metrics/logs.
- Services/modules and their responsibility: API server (`src/server.js`), job runner (`scripts/run-backtest.js`, `src/engine/*`), integrations (`src/integrations/binance`, `src/notify/telegram.js`), client (`client/`).
- Data flow: Requests → Express routes → business logic → PostgreSQL storage → responses/notifications.
- Dependencies: PostgreSQL, Binance REST & WebSocket, Stripe Checkout, Telegram Bot, Prometheus stack.

## 3. Codebase Layout
- Root structure: see `tree -L 2` in survey (artifacts/repo-survey.md#top-level-tree-depth-2).
- Notable entries: `src/` for server logic, `client/` for frontend, `migrations/` for DB, `deploy/` for docker-compose and observability, `scripts/` for automation.

## 4. Runtime & Operations
- How to run locally:
  - `npm install` (root) and `cd client && npm install && npm run build`
  - `cp .env.example .env`
  - `npm run initdb`
  - `npm run live` (Binance & Telegram)
  - `npm run dev` (API at http://localhost:3000)
  - Docker: `docker compose up --build`
- Configuration & ENV:

  | Variable | Purpose |
  | --- | --- |
  | PORT | Server port |
  | PUBLIC_URL | Base URL for client callbacks |
  | DATABASE_URL | PostgreSQL connection string |
  | BINANCE_BASE_URL | Binance Futures base URL |
  | BINANCE_API_KEY | Binance API key |
  | BINANCE_API_SECRET | Binance API secret |
  | TELEGRAM_BOT_TOKEN | Telegram bot token |
  | TELEGRAM_PUBLIC_CHAT_ID | Channel for public alerts |
  | TELEGRAM_PRIVATE_CHAT_ID | Channel for private alerts |
  | STRIPE_SECRET_KEY | Stripe API key |
  | STRIPE_PRICE_ID | Stripe price ID |
  | STRIPE_WEBHOOK_SECRET | Verify Stripe webhook |
  | SLO_API_AVAIL, SLO_API_LAT_P95, SLO_SSE_AVAIL, SLO_JOBS_SUCCESS | SLO targets |
  | SSE_PING_INTERVAL_SEC | SSE ping interval seconds |

- Ports & endpoints exposure: server runs on 3000; observability stack uses 4317/4318 (OTEL), 5432 (Postgres), 3100 (Loki), 9090 (Prometheus), 9093 (Alertmanager), 3001 (Grafana).
- Build & release: GitHub Actions workflows (`test.yml`, `client-tests.yml`, `deploy-dev.yml`) handle tests and Cloud Run deployment (artifacts/repo-survey.md#cicd-github-actions-et-al).

## 5. Data Model
- DB engine + versija: PostgreSQL (docker image `postgres:15-alpine`).
- Schemos apžvalga: migrations create enums `job_type`, `job_status`; tables `jobs`, `live_equity_snapshots`, `overlay_sets`, `analytics_overlay_shares`, `perf_indexes`, `positions`, `paper_trades`, `strategy_configs`, etc.
- Duomenų gyvavimo ciklas: ingestion from Binance → processing via jobs → stored in PostgreSQL → analytics/overlays served to client.

## 6. APIs & Interfaces
- HTTP routes: see survey output (artifacts/repo-survey.md#api-routes-expressfastifykoa-hints) for detailed list including `/healthz`, `/metrics`, `/jobs`, `/portfolio`, `/api/checkout-session`, etc.
- WebSockets/streaming: SSE endpoints like `/events` and `/live/equity-stream` (artifacts/repo-survey.md#websocketstreaming-hints).
- CLI/Jobs/Workers: scripts `backtest`, `live`, `opt`, `wf`, cron-like jobs not explicitly defined (GAPS).
- Third-party integrations: Binance REST & WS, Stripe checkout session, Telegram bot notifications.

## 7. Frontend (jei yra)
- Tech stack: React + Vite (client/package.json).
- Pagrindiniai puslapiai: `client/public/analytics.html`, `live.html`, etc. Uses simple static pages served by server.
- Build/serve komandos: `npm run build:client` or `cd client && npm run build`; `npm run serve:client` for local preview.

## 8. Observability
- Logs: pino JSON logs; log forwarding via Loki (deploy/promtail optional).
- Metrics: `/metrics` endpoint, Prometheus scrape configs (deploy/prometheus/prometheus.yml).
- Alerting: Alertmanager with rules in `deploy/prometheus/rules/*`.
- Dashboards: Grafana provisioning in `deploy/grafana/provisioning` (artifacts).

## 9. Security & Compliance
- Secrets management: environment variables in `.env`, `.env.example`; GitHub Actions secrets for Cloud Run deploy.
- AuthZ/AuthN: none detected beyond Stripe webhook and optional tokens (GAPS).
- Network exposure: Caddy reverse proxy with TLS; server ports exposed via docker-compose.
- Saugumo skolos: no explicit auth or rate limiting (GAPS/TBD).

## 10. Testing & QA
- Test frameworks: Jest for server and client tests, Playwright for e2e (artifacts/repo-survey.md#tests).
- Coverage rodikliai: client coverage badge ~92% (README).
- Smoke/health checks: `/healthz` endpoint; `scripts/smoke-observ.js` for observability.

## 11. Backlog: Gaps & Recommendations
- Document and enforce auth strategy (JWT or API keys).
- Expand DB schema documentation and migrations review.
- Add automated migration testing and e2e coverage for Stripe/Binance flows.
- Clarify job scheduling/cron responsibilities.

## Appendix
- Nuorodos į `artifacts/repo-survey.md` skyriai:
  - [Top-level Tree](../artifacts/repo-survey.md#top-level-tree-depth-2)
  - [Package Managers & Modules](../artifacts/repo-survey.md#package-managers--modules)
  - [Docker / Compose / K8s](../artifacts/repo-survey.md#docker--compose--k8s)
  - [Environment Templates](../artifacts/repo-survey.md#environment-templates--samples)
  - [API Routes](../artifacts/repo-survey.md#api-routes-expressfastifykoa-hints)
  - [WebSocket/Streaming](../artifacts/repo-survey.md#websocketstreaming-hints)
  - [CI/CD](../artifacts/repo-survey.md#cicd-github-actions-et-al)
  - [Tests](../artifacts/repo-survey.md#tests)
- Versijų/trikdžių sąrašas: GAPS – not inventoried yet.
