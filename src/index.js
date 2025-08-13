import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import { cfg } from './config.js';
import { db } from './storage/db.js';
import { createCheckoutSession, stripeWebhook } from './payments/stripe.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(cookieParser());

// Stripe webhook must use raw body
app.post('/webhook/stripe', bodyParser.raw({ type: 'application/json' }), stripeWebhook);

// JSON body for general APIs
app.use(bodyParser.json());

// Health
app.get('/health', (req, res) => res.json({ ok: true }));

// Latest signal
app.get('/signals/latest', (req, res) => {
  db.get('SELECT * FROM signals ORDER BY ts DESC LIMIT 1', [], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row || null);
  });
});

// Stripe checkout
app.post('/api/checkout-session', createCheckoutSession);

// Serve static (React build copied to /public)
app.use(express.static(path.join(__dirname, '../public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(cfg.port, () => console.log(`HTTP on :${cfg.port}`));
