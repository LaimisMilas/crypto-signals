#!/usr/bin/env bash
set -euo pipefail

API_URL="${API_URL:-http://localhost:3000}"
EMAIL="${AUTH_EMAIL:-test@example.com}"
SECRET="${AUTH_SECRET:-}"

if [[ -z "$SECRET" ]]; then
  echo "AUTH_SECRET is required" >&2
  exit 1
fi

TOKEN=$(node - "$EMAIL" "$SECRET" <<'NODE'
const [email, secret] = process.argv.slice(1);
const crypto = require('crypto');
function b64url(input){ return Buffer.from(input).toString('base64url'); }
const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
const payload = b64url(JSON.stringify({ email, exp: Math.floor(Date.now()/1000)+60 }));
const sig = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
console.log(`${header}.${payload}.${sig}`);
NODE
)

echo "==> Request without token (expect 401)"
curl -s -w '\nHTTP %{http_code}\n' "$API_URL/live"

echo "==> Request with invalid token (expect 401)"
curl -s -w '\nHTTP %{http_code}\n' -H "Authorization: Bearer invalid" "$API_URL/live"

echo "==> Request with valid token (expect 200 if subscriber active)"
curl -s -w '\nHTTP %{http_code}\n' -H "Authorization: Bearer $TOKEN" "$API_URL/live"
