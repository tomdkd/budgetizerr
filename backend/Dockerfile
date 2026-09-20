# syntax=docker/dockerfile:1

FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json turbo.json ./
COPY backend/package.json backend/package.json

RUN npm ci

COPY backend backend

RUN npm run build -w backend

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json

RUN npm ci --omit=dev --workspace=backend

# VAPID keys are generated once at build time so no secret needs to ship in a .env file
RUN node -e "require('fs').writeFileSync('.vapid-keys.json', JSON.stringify(require('web-push').generateVAPIDKeys()))"

COPY --from=builder /app/backend/dist ./backend/dist
COPY backend/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3001
CMD ["./docker-entrypoint.sh"]
