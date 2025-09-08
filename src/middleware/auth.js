import crypto from 'crypto';
import { db } from '../storage/db.js';

const SECRET = process.env.AUTH_SECRET || '';

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function signToken(payload, secret = SECRET) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

function verifyToken(token, secret = SECRET) {
  const parts = String(token).split('.');
  if (parts.length !== 3) throw new Error('invalid');
  const [headerB64, payloadB64, signature] = parts;
  const data = `${headerB64}.${payloadB64}`;
  const expected = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    throw new Error('signature');
  }
  const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  if (payload.exp && Date.now() / 1000 >= payload.exp) {
    throw new Error('expired');
  }
  return payload;
}

export async function auth(req, res, next) {
  if (!SECRET) return res.status(500).json({ error: 'auth_disabled' });
  const header = req.headers['authorization'] || '';
  let token = null;
  const match = header.match(/^Bearer (.+)$/);
  if (match) token = match[1];
  else if (req.query && req.query.token) token = String(req.query.token);
  else if (req.cookies && (req.cookies.auth_token || req.cookies.token)) {
    token = req.cookies.auth_token || req.cookies.token;
  }
  if (!token) return res.status(401).json({ error: 'unauthorized' });
  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const email = (payload.email || payload.sub || '').trim().toLowerCase();
  if (!email) return res.status(403).json({ error: 'subscription_required' });

  try {
    const { rows } = await db.query(
      `SELECT status FROM subscribers WHERE email=$1 ORDER BY id DESC LIMIT 1`,
      [email]
    );
    const status = rows[0]?.status;
    if (!['active', 'trialing'].includes(status)) {
      return res.status(403).json({ error: 'subscription_inactive' });
    }
    req.user = payload;
    next();
  } catch (e) {
    console.error('auth db error:', e);
    return res.status(500).json({ error: 'auth_db_error' });
  }
}

export const jwt = { sign: signToken, verify: verifyToken };

export default auth;
