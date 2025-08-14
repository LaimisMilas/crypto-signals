#!/usr/bin/env bash
set -euo pipefail

# Simple init for Ubuntu/Debian VPS
# Usage: bash init-server.sh

if ! command -v docker >/dev/null 2>&1; then
  echo "[*] Installing Docker..."
  curl -fsSL https://get.docker.com | sh
fi

if ! command -v docker-compose >/dev/null 2>&1 && ! docker compose version >/dev/null 2>&1; then
  echo "[*] Installing docker-compose plugin..."
  mkdir -p ~/.docker/cli-plugins
  COMPOSE_URL="https://github.com/docker/compose/releases/download/v2.27.1/docker-compose-$(uname -s)-$(uname -m)"
  curl -L "$COMPOSE_URL" -o ~/.docker/cli-plugins/docker-compose
  chmod +x ~/.docker/cli-plugins/docker-compose
fi

sudo usermod -aG docker "$USER" || true

echo "[*] Docker version:"; docker --version
echo "[*] Docker Compose version:"; docker compose version || true

echo "[*] Done. Log out and back in for docker group to take effect if needed."
