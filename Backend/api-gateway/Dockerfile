# 1) Build stage for TypeScript → JS.
FROM node:20-bookworm-slim AS build
WORKDIR /app

# 2) Install deps (prefer ci if lockfile exists).
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./
RUN npm ci

# 3) Copy source + tsconfig and compile.
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc

# 4) Runtime stage (tiny, fast start).
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
EXPOSE 8080
CMD ["node", "dist/server.js"]