#!/usr/bin/env bash
set -euo pipefail

# --- Konfigūracija (galima perrašyti per env) ---
API_URL="${API_URL:-http://localhost:3000}"
EMAIL="${EMAIL:-demo@local}"
SECRET="${SECRET:-devsecret}"
TTL="${TTL:-3600}"
ISS="${ISS:-crypto-signals}"
AUD="${AUD:-api}"
SYMBOL="${SYMBOL:-SOLUSDT}"
INTERVAL="${INTERVAL:-1m}"

# --- Būtinybės ---
command -v node >/dev/null || { echo "Reikia node"; exit 1; }
command -v curl >/dev/null || { echo "Reikia curl"; exit 1; }
command -v jq >/dev/null || { echo "Reikia jq"; exit 1; }

# --- 1) JWT generavimas ---
TOKEN="$(node scripts/gen-jwt.mjs --email "$EMAIL" --secret "$SECRET" --ttl "$TTL" --iss "$ISS" --aud "$AUD")"
if [[ -z "$TOKEN" ]]; then
  echo "Nepavyko sugeneruoti TOKEN"; exit 1
fi
echo "TOKEN OK (len=${#TOKEN})"
echo $TOKEN

# --- 2) Įrašom 1 snapshot tašką ---
TS="$(date +%s%3N)"
echo "Rašau snapshot: ts=$TS equity=10050"
http_code="$(curl -s -o /tmp/seed_resp.json -w "%{http_code}" \
  -X POST "$API_URL/live/equity/snapshot" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  --data "{\"ts\":$TS,\"equity\":10050}")"

if [[ "$http_code" != "201" ]]; then
  echo "Snapshot įrašas nesėkmingas: HTTP $http_code"; cat /tmp/seed_resp.json; echo; exit 1
fi
echo "Snapshot įrašytas ✅"

# --- 3) Live sluoksnio patikra ---
live_len="$(curl -s -H "Authorization: Bearer $TOKEN" \
  "$API_URL/live/equity?symbol=$SYMBOL&interval=$INTERVAL&ds=none&n=0" | jq '.points | length')"
echo "Live points: $live_len"
if [[ "$live_len" -lt 1 ]]; then
  echo "Tikėtasi ≥1 live taško, gauta $live_len"; exit 1
fi

# --- 4) Analytics baseline patikra per 24h ---
FMS="$(( $(date +%s%3N) - 24*60*60*1000 ))"
baseline_len="$(curl -s \
  "$API_URL/analytics?baseline=live&symbol=$SYMBOL&interval=$INTERVAL&from_ms=$FMS" \
  | jq '.baseline.equity | length')"
echo "Analytics baseline points (24h): $baseline_len"

# --- 5) Santrauka ---
echo
echo "🎯 Paruošta. Atidaryk UI: $API_URL/analytics.html ir paspausk 'Apply'."
echo "Jei grafikas tuščias, pakartok 'Apply' arba padidink from_ms intervalą."
