# ---- Build client ----
FROM node:20-alpine AS client
WORKDIR /app
COPY client/package.json client/package-lock.json* client/pnpm-lock.yaml* client/yarn.lock* ./
RUN npm install
COPY client/ ./
RUN npm run build

# ---- Server ----
FROM node:20-alpine AS server
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN npm install --production
COPY src ./src
COPY public ./public
# Copy client build from previous stage
COPY --from=client /app/dist/ ./public
# runtime
ENV PORT=3000
EXPOSE 3000
CMD ["node", "src/index.js"]
