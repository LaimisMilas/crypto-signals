#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROMDIR="$DIR/deploy/prometheus"

FILES=()
for f in alerts.yml recording-rules.yml alerts-burnrate.yml; do
  [ -f "$PROMDIR/$f" ] && FILES+=("/etc/prometheus/$f")
done

if [ ${#FILES[@]} -eq 0 ]; then
  echo "No rule files found in $PROMDIR" >&2
  exit 1
fi

docker run --rm \
  -v "$PROMDIR:/etc/prometheus" \
  --entrypoint /bin/promtool \
  prom/prometheus:latest \
  check rules "${FILES[@]}"

