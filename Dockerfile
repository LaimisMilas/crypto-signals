# deps layer
FROM node:20 AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# runtime
FROM node:20
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["node", "src/server.js"]

