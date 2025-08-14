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

      const full = await stripe.checkout.sessions.retrieve(sessionObj.id, {
        expand: ['subscription', 'customer']
      });

      const subId =
          (typeof full.subscription === 'string' ? full.subscription : full.subscription?.id) || null;

      const email =
          full.customer_details?.email ||
          (full.customer && full.customer.email) ||
          null;

      console.log('📝 [WEBHOOK] checkout.completed email:', email, 'sub:', subId);

      if (!subId) {
        console.warn('⚠️ [WEBHOOK] Subscription ID nerastas, laukiam sub.* įvykių');
        return res.json({received: true});
      }

      try {
        await db.query(
          `INSERT INTO subscribers (email, subscription_id, status, created_at)
           VALUES ($1, $2, $3, $4)`,
          [email, subId, 'active', Date.now()]
        );
        console.log('✅ [DB] Subscriber added', email || '(no-email)', subId);
      } catch (err) {
        console.error('DB insert subscriber error', err.message);
      }
      break;
    }
    case 'customer.subscription.deleted':
      await onSubscriptionUpdated(event.data.object, 'canceled');
      break;
    case 'customer.subscription.updated':
      await onSubscriptionUpdated(event.data.object, event.data.object.status);
      break;
    default:
      break;
  }
  res.json({received: true});
}

function requireEvent(rawBody, sig) {
  const stripe = new Stripe(cfg.stripeSecret, { apiVersion: '2024-06-20' });
  return stripe.webhooks.constructEvent(rawBody, sig, cfg.stripeWebhookSecret);
}

async function onCheckoutCompleted(session) {
  const email = session.customer_details?.email || null;
  const subId = session.subscription;
  try {
    await db.query(
      `INSERT INTO subscribers (email, subscription_id, status, created_at)
       VALUES ($1,$2,$3,$4)`,
      [email, subId, 'active', Date.now()]
    );
    console.log('Subscriber added', email);
  } catch (err) {
    console.error('DB insert subscriber error', err.message);
  }
}

async function onSubscriptionUpdated(sub, status) {
  try {
    const result = await db.query(
      `UPDATE subscribers SET status=$1 WHERE subscription_id=$2`,
      [status, sub.id]
    );
    if (result.rowCount === 0) {
      await db.query(
        `INSERT INTO subscribers (email, subscription_id, status, created_at)
         VALUES ($1,$2,$3,$4)`,
        [null, sub.id, status, Date.now()]
      );
      console.log('✅ [DB] UPSERT', sub.id, status);
    } else {
      console.log('✅ [DB] Status updated', sub.id, status);
    }
  } catch (err) {
    console.error('DB update err', err.message);
  }
}
