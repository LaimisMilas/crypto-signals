# Crypto Signals – Deploy (Docker + Caddy)
Domain: https://clicker.lt
Image: ghcr.io/laimismilas/crypto-signals:latest
1) On the server:
   bash deploy/init-server.sh
   sudo mkdir -p /opt/crypto-signals && sudo chown $USER:$USER /opt/crypto-signals
   cp deploy/docker-compose.yml /opt/crypto-signals/docker-compose.yml
   cp deploy/Caddyfile        /opt/crypto-signals/Caddyfile
   cp deploy/.env.example     /opt/crypto-signals/.env   # fill Stripe/Telegram
2) Start:
   cd /opt/crypto-signals
   docker compose pull
   docker compose up -d
3) Stripe webhook: https://clicker.lt/webhook/stripe (checkout.session.completed, customer.subscription.updated, customer.subscription.deleted)
