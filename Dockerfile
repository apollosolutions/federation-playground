# Build frontend and backend TypeScript
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY frontend/package.json frontend/
COPY backend/package.json backend/
RUN npm ci

COPY frontend ./frontend
COPY backend ./backend
RUN npm run build

# Production: install production deps for workspaces, run backend only
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY frontend/package.json frontend/
COPY backend/package.json backend/
RUN npm ci --omit=dev

COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/public ./backend/public

WORKDIR /app/backend
ENV PORT=3000
EXPOSE 3000
CMD ["node", "dist/index.js"]
