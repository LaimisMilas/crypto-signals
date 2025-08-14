#!/usr/bin/env bash
set -euo pipefail
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
if ! command -v docker-compose >/dev/null 2>&1 && ! docker compose version >/dev/null 2>&1; then
  mkdir -p ~/.docker/cli-plugins
  COMPOSE_URL="https://github.com/docker/compose/releases/download/v2.27.1/docker-compose-$(uname -s)-$(uname -m)"
  curl -L "$COMPOSE_URL" -o ~/.docker/cli-plugins/docker-compose
  chmod +x ~/.docker/cli-plugins/docker-compose
fi
sudo usermod -aG docker "$USER" || true
docker --version
docker compose version || true
echo "Init done."
