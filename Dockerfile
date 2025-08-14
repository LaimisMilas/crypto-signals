FROM node:20
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev
COPY . .
RUN npm run build:client
ENV PORT=3000
EXPOSE 3000
CMD ["npm", "start"]
