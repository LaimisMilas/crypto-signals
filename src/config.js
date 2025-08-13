import 'dotenv/config';

export const cfg = {
  port: process.env.PORT || 3000,
  publicUrl: process.env.PUBLIC_URL || 'http://localhost:3000',
  binanceBase: process.env.BINANCE_BASE,
  symbol: process.env.SYMBOL || 'SOLUSDT',
  interval: process.env.INTERVAL || '1m',
  tgToken: process.env.TELEGRAM_BOT_TOKEN,
  tgPublic: process.env.TELEGRAM_PUBLIC_CHAT_ID,
  tgPrivate: process.env.TELEGRAM_PRIVATE_CHAT_ID,
  stripeSecret: process.env.STRIPE_SECRET_KEY,
  stripePriceId: process.env.STRIPE_PRICE_ID,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
};
