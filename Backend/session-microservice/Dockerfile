# Build stage
FROM node:20-bookworm-slim AS base

# Add toolchain for native addons like better-sqlite3
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Leverage layer cache
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./

# Install with scripts so native addon gets built or prebuilt downloaded
RUN npm ci

# Copy source and build
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc

# Runtime stage
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/dist ./dist
COPY --from=base /app/package.json ./package.json

EXPOSE 3000
CMD ["node", "dist/server.js"]