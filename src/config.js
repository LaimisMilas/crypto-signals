import 'dotenv/config';
import path from 'path';

export const ARTIFACTS_ROOT = path.resolve(process.env.ARTIFACTS_ROOT || './.artifacts');

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
  dbUrl: process.env.DATABASE_URL,
  riskPerTradePct: Number(process.env.RISK_PER_TRADE_PCT) || 1.0,
  atrPeriod: Number(process.env.ATR_PERIOD) || 14,
  slAtrMult: Number(process.env.SL_ATR_MULT) || 2.0,
  tpAtrMult: Number(process.env.TP_ATR_MULT) || 3.0,
  leverage: Number(process.env.LEVERAGE) || 5,
  positionMode: process.env.POSITION_MODE || 'ONE_WAY',
  artifactsRoot: ARTIFACTS_ROOT,
};
