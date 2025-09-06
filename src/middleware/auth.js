import crypto from 'crypto';

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

export function auth(req, res, next) {
  if (!SECRET) return res.status(500).json({ error: 'auth_disabled' });
  const header = req.headers['authorization'] || '';
  const match = header.match(/^Bearer (.+)$/);
  if (!match) return res.status(401).json({ error: 'unauthorized' });
  try {
    const payload = verifyToken(match[1]);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'unauthorized' });
  }
}

export const jwt = { sign: signToken, verify: verifyToken };

export default auth;
