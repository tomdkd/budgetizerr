FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json turbo.json ./
COPY frontend/package.json frontend/package.json
COPY backend/package.json backend/package.json

RUN npm ci

COPY frontend frontend
COPY backend backend

RUN npm run build -w frontend

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/frontend/.next/standalone ./
COPY --from=builder /app/frontend/.next/static ./frontend/.next/static
COPY --from=builder /app/frontend/public ./frontend/public

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
# Internal Docker hostname of the backend, used server-side only by the rewrites proxy
ENV BACKEND_INTERNAL_URL=http://backend:3001

EXPOSE 3000
CMD ["node", "frontend/server.js"]
