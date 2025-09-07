#!/usr/bin/env node
/**
 * Minimal JWT (HS256) generator for ESM projects
 * Usage:
 *   node scripts/gen-jwt.mjs --email demo@local --secret devsecret --ttl 3600 [--iss crypto-signals] [--aud api]
 */
import crypto from 'crypto';

function arg(name, def = undefined) {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0 && i + 1 < process.argv.length) return process.argv[i + 1];
  return process.env[name.toUpperCase()] ?? def;
}
function b64url(bufOrStr) {
  return Buffer.from(bufOrStr)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

const email = String(arg('email', 'demo@local')).trim().toLowerCase();
const secret = String(arg('secret', ''));
if (!secret) {
  console.error('Missing --secret (or SECRET env)');
  process.exit(2);
}

const ttl = Number(arg('ttl', '3600')) || 3600;
const iss = arg('iss', undefined);
const aud = arg('aud', undefined);

const now = Math.floor(Date.now() / 1000);

const header = { alg: 'HS256', typ: 'JWT' };
const payload = {
  email,
  sub: email,
  iat: now,
  nbf: now - 10,
  exp: now + ttl,
  ...(iss ? { iss } : {}),
  ...(aud ? { aud } : {}),
};

const headerB64 = b64url(JSON.stringify(header));
const payloadB64 = b64url(JSON.stringify(payload));
const data = `${headerB64}.${payloadB64}`;

const signature = crypto
  .createHmac('sha256', secret)
  .update(data)
  .digest('base64')
  .replace(/=/g, '')
  .replace(/\+/g, '-')
  .replace(/\//g, '_');

process.stdout.write(`${data}.${signature}`);
