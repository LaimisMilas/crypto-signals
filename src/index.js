import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import { cfg } from './config.js';
import { db } from './storage/db.js';
import { createSingleUseInviteLink } from './notify/telegram.js';
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

app.get('/api/telegram-invite', async (req, res) => {
  try {
    const email = (req.query.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ error: 'email_required' });

    db.get(
        `SELECT subscription_id, status FROM subscribers
       WHERE email = ? ORDER BY id DESC LIMIT 1`,
        [email],
        async (err, row) => {
          if (err) return res.status(500).json({ error: 'db_error' });
          if (!row) return res.status(404).json({ error: 'not_found' });
          if (row.status !== 'active' && row.status !== 'trialing')
            return res.status(403).json({ error: 'not_active' });

          try {
            const invite = await createSingleUseInviteLink();
            return res.json({ invite });
          } catch (e) {
            console.error('invite link error:', e.message);
            return res.status(500).json({ error: 'invite_failed' });
          }
        }
    );
  } catch (e) {
    return res.status(500).json({ error: 'server_error' });
  }
});

app.listen(cfg.port, () => console.log(`HTTP on :${cfg.port}`));
