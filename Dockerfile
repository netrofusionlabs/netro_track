# ============================================
# Stage 1: Build
# ============================================
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Copy workspace manifests first for better Docker caching
COPY package.json package-lock.json ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared/package.json ./packages/shared/

# Install all workspace dependencies
RUN npm ci

# Copy TypeScript configuration
COPY tsconfig.base.json ./

# Copy source
COPY packages/shared ./packages/shared
COPY apps/backend ./apps/backend

# Build shared package first
RUN npm run build --workspace=packages/shared

# Generate Prisma client
RUN npm run prisma:generate --workspace=apps/backend

# Build backend
RUN npm run build --workspace=apps/backend


# ============================================
# Stage 2: Production
# ============================================
FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy workspace manifests
COPY package.json package-lock.json ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared/package.json ./packages/shared/

# Install production dependencies only
RUN npm ci --omit=dev

# Copy compiled shared package
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

# Copy compiled backend
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist

# Copy Prisma schema/migrations
COPY --from=builder /app/apps/backend/prisma ./apps/backend/prisma

# Copy generated Prisma client
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

WORKDIR /app/apps/backend

EXPOSE 3000

CMD ["node", "dist/server.js"]