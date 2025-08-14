# Crypto Signals – Production Deploy (Docker + Caddy)

Domain: **https://clicker.lt**
Repo/Image: **ghcr.io/LaimisMilas/crypto-signals:latest**
Notifications: **laimis.milasius@gmail.com** (Let's Encrypt admin email)

## 0) Prereqs
- A-record for `clicker.lt` points to your VPS IP.
- GitHub Actions has SSH access to the server.

## 1) GitHub Actions Secrets (in LaimisMilas/crypto-signals)
Settings → Secrets and variables → Actions:
- `SSH_HOST`   → your.server.ip.or.name
- `SSH_USER`   → e.g. `ubuntu`
- `SSH_KEY`    → private key contents
- `SSH_KNOWN_HOSTS` → output of `ssh-keyscan -H your.server`

## 2) Prepare server
```bash
bash deploy/init-server.sh

sudo mkdir -p /opt/crypto-signals
sudo chown $USER:$USER /opt/crypto-signals
cp deploy/docker-compose.yml /opt/crypto-signals/docker-compose.yml
cp deploy/Caddyfile /opt/crypto-signals/Caddyfile
cp deploy/.env.example /opt/crypto-signals/.env
nano /opt/crypto-signals/.env   # fill Stripe/Telegram vars
```

## 3) First run
```bash
cd /opt/crypto-signals
docker compose pull
docker compose up -d
docker compose logs -f
```

Open `https://clicker.lt` when up.

## 4) Stripe Webhooks (prod)
Endpoint:
```
https://clicker.lt/webhook/stripe
```
Send events:
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

## 5) Update flow
Push to `main` on GitHub → Actions builds and deploys. Or:
```bash
docker compose pull && docker compose up -d
```
