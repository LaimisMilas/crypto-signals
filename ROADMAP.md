# Crypto Signals Roadmap

## ✅ Completed
- Express service on Node.js 20 with Binance, Stripe and Telegram integrations.
- Signal engine with RSI14, ATR14, trend detection, bullish‑engulfing pattern and AI score placeholder.
- Backtesting and optimisation scripts (`run-backtest.js`, `optimize.js`, `walkforward.js`).
- Live monitoring/paper trading via SSE routes and Binance user-stream.
- Analytics dashboard served by React/Vite client.
- Stripe checkout and Telegram invite hooks for future SaaS.

## 🚧 Next steps

### 1. Trading automation
- Expand `src/routes/auto.js` and `src/risk/orders.js` to place real Binance orders.
- Implement stop-loss, take-profit and trailing logic in `risk/applyRisk.js`.
- Update database migrations and add tests covering order execution.

### 2. SaaS & deployment
- Enforce subscription-aware auth in `src/middleware/auth.js`.
- Send VIP signals via `src/notify/telegram.js`.
- Document cloud deployment steps in `deploy/`.

### 3. Indicators & AI
- Add Aroon and Bollinger Bands indicators plus support/resistance and more candle patterns.
- Integrate real ML/DL models in `src/signal/ai/`.

### 4. Multi-strategy portfolio
- Create strategy registry in `src/strategies/index.js` and expose portfolio routes/UI.

### 5. Documentation & security
- Generate ER diagram from migrations and document schema in `docs/`.
- Document frontend structure and state management.
- Provide Kubernetes + HTTPS guidelines and `docs/security.md` for secret rotation.

### 6. Testing
- Increase integration test coverage for Binance, Stripe and Telegram flows.

