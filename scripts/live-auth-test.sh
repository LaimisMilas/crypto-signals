#!/usr/bin/env bash
set -euo pipefail

API_URL="${API_URL:-http://localhost:3000}"
EMAIL="${EMAIL:-demo@local}"
SECRET="${SECRET:-devsecret}"
TTL="${TTL:-3600}"
ISS="${ISS:-crypto-signals}"
AUD="${AUD:-api}"

TOKEN=$(node scripts/gen-jwt.mjs --email "$EMAIL" --secret "$SECRET" --ttl "$TTL" --iss "$ISS" --aud "$AUD")

echo "==> Request without token (expect 401)"
curl -s -w '\nHTTP %{http_code}\n' "$API_URL/live"

echo "==> Request with invalid token (expect 401)"
curl -s -w '\nHTTP %{http_code}\n' -H "Authorization: Bearer invalid" "$API_URL/live"

echo "==> Request with valid token (expect 200 if subscriber active)"
curl -s -w '\nHTTP %{http_code}\n' -H "Authorization: Bearer $TOKEN" "$API_URL/live"
