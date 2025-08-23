# ---- base ----
FROM node:20-slim AS base
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*

# ---- deps ----
FROM base AS deps
COPY package*.json ./
RUN npm ci --omit=dev

# ---- build (if needed for FE) ----
FROM base AS build
COPY . .
RUN npm ci && npm run build || true

# ---- runtime ----
FROM base AS runtime
USER node
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --chown=node:node . .
EXPOSE 8080
CMD ["node","src/server.js"]
