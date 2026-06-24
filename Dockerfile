FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10.11.0 --activate

WORKDIR /app

# Copy workspace manifests first (layer cache)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json tsconfig.json ./
COPY lib/              ./lib/
COPY scripts/          ./scripts/
COPY artifacts/api-server/   ./artifacts/api-server/
COPY artifacts/mc-dashboard/ ./artifacts/mc-dashboard/

# Full install (workspace links resolved)
RUN pnpm install --frozen-lockfile

# Build shared libs (needed by both artifacts)
RUN pnpm run typecheck:libs

# Build Vite frontend — PORT/BASE_PATH only used by dev server, not vite build
ENV BASE_PATH=/ PORT=3000 NODE_ENV=production
RUN pnpm --filter @workspace/mc-dashboard exec vite build --config vite.config.ts

# Build API server (esbuild bundle)
RUN pnpm --filter @workspace/api-server run build

# ── Production image ─────────────────────────────────────────────────────────
FROM node:20-alpine

RUN corepack enable && corepack prepare pnpm@10.11.0 --activate

WORKDIR /app

# Copy workspace manifests
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json tsconfig.json ./
COPY lib/    ./lib/
COPY scripts/ ./scripts/
COPY artifacts/api-server/package.json   ./artifacts/api-server/package.json
# mc-dashboard only needs the built dist at runtime
COPY artifacts/mc-dashboard/package.json ./artifacts/mc-dashboard/package.json

# Production deps only (includes mineflayer which is externalized by esbuild)
RUN pnpm install --frozen-lockfile --prod

# Copy built bundles from builder
COPY --from=builder /app/artifacts/api-server/dist        ./artifacts/api-server/dist
COPY --from=builder /app/artifacts/mc-dashboard/dist      ./artifacts/mc-dashboard/dist

ENV PORT=3000 NODE_ENV=production

EXPOSE 3000

CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
