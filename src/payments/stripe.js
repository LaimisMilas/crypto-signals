import Stripe from 'stripe';
import { cfg } from '../config.js';
import { db } from '../storage/db.js';

const stripe = new Stripe(cfg.stripeSecret, { apiVersion: '2024-06-20' });

export async function createCheckoutSession(req, res) {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price: cfg.stripePriceId,
        quantity: 1
      }],
      success_url: `${cfg.publicUrl}/?success=true`,
      cancel_url: `${cfg.publicUrl}/?canceled=true`,
      allow_promotion_codes: true
    });
    res.json({ id: session.id, url: session.url });
  } catch (e) {
    console.error('Stripe error:', e);
    res.status(500).json({ error: 'stripe_failed' });
  }
}

export async function stripeWebhook(req, res) {
  let event;
  try {
    const sig = req.headers['stripe-signature'];
    event = requireEvent(req.body, sig);
  } catch (err) {
    console.error(err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  switch (event.type) {
    case 'checkout.session.completed': {
      const sessionObj = event.data.object;

      // 1) parsinešam pilną Session su expand
      const full = await stripe.checkout.sessions.retrieve(sessionObj.id, {
        expand: ['subscription', 'customer']
      });

      // 2) subscription ID
      const subId =
          (typeof full.subscription === 'string' ? full.subscription : full.subscription?.id) || null;

      // 3) email
      const email =
          full.customer_details?.email ||
          (full.customer && full.customer.email) ||
          null;

      console.log('📝 [WEBHOOK] checkout.completed email:', email, 'sub:', subId);

      // 4) jei neradom subId – tiesiog išeinam (ateis kiti sub.* eventai)
      if (!subId) {
        console.warn('⚠️ [WEBHOOK] Subscription ID nerastas, laukiam sub.* įvykių');
        return res.json({received: true});
      }

      db.run(
          `INSERT INTO subscribers (email, subscription_id, status, created_at)
           VALUES (?, ?, ?, strftime('%s', 'now') * 1000)`,
          [email, subId, 'active'],
          (err) => {
            if (err) console.error('DB insert subscriber error', err.message);
            else console.log('✅ [DB] Subscriber added', email || '(no-email)', subId);
          }
      );
      break;
    }
    case 'customer.subscription.deleted':
      onSubscriptionUpdated(event.data.object, 'canceled');
      break;
    case 'customer.subscription.updated':
      onSubscriptionUpdated(event.data.object, event.data.object.status);
      break;
    default:
      // ignore others
      break;
  }
  res.json({received: true});
}

function requireEvent(rawBody, sig) {
  const stripe = new Stripe(cfg.stripeSecret, { apiVersion: '2024-06-20' });
  return stripe.webhooks.constructEvent(rawBody, sig, cfg.stripeWebhookSecret);
}

function onCheckoutCompleted(session) {
  // You can query customer email
  const email = session.customer_details?.email || null;
  const subId = session.subscription;
  db.run(
    `INSERT INTO subscribers (email, subscription_id, status, created_at)
     VALUES (?,?,?, strftime('%s','now')*1000)`,
    [email, subId, 'active'],
    (err) => {
      if (err) console.error('DB insert subscriber error', err.message);
      else console.log('Subscriber added', email);
    }
  );
}

function onSubscriptionUpdated(sub, status) {
  db.run(
      `UPDATE subscribers SET status=? WHERE subscription_id=?`,
      [status, sub.id],
      function (err) {
        if (err) return console.error('DB update err', err.message);
        if (this.changes === 0) {
          db.run(
              `INSERT INTO subscribers (email, subscription_id, status, created_at)
           VALUES (?,?,?, strftime('%s','now')*1000)`,
              [null, sub.id, status],
              (e2) => e2 ? console.error('DB upsert err', e2.message)
                  : console.log('✅ [DB] UPSERT', sub.id, status)
          );
        } else {
          console.log('✅ [DB] Status updated', sub.id, status);
        }
      }
  );
}