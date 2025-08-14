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

## Disclaimer
Educational purposes only. No financial advice.
