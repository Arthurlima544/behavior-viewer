# syntax=docker/dockerfile:1
# Imagem do Behavior Viewer: build em múltiplos estágios, usuário não-root (RNF-02, RNF-03).
# Base Debian (slim): o binário nativo do better-sqlite3 não é compatível com musl (Alpine).

FROM node:22-slim AS deps
# Ferramentas de compilação só neste estágio: caso o better-sqlite3 precise compilar nativamente.
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/domain/package.json packages/domain/
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
RUN npm ci --no-audit --no-fund

FROM deps AS build
COPY . .
RUN npm run build -w packages/domain \
 && npm run build -w apps/server \
 && npm run build -w apps/web \
 && npm prune --omit=dev --no-audit --no-fund

FROM node:22-slim AS runtime
ENV NODE_ENV=production \
    BEHAVIOR_HOST=0.0.0.0 \
    BEHAVIOR_PORT=8787 \
    BEHAVIOR_WORKSPACE=/workspace \
    BEHAVIOR_DATA_DIR=/data \
    BEHAVIOR_SCAN_INTERVAL=60 \
    BEHAVIOR_LOG_LEVEL=info
WORKDIR /app
RUN groupadd --system --gid 10001 behavior \
 && useradd --system --uid 10001 --gid behavior --no-create-home behavior \
 && mkdir -p /data /workspace \
 && chown behavior:behavior /data
COPY --from=build --chown=root:root /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/packages/domain/package.json packages/domain/
COPY --from=build /app/packages/domain/dist packages/domain/dist
COPY --from=build /app/apps/server/package.json apps/server/
COPY --from=build /app/apps/server/dist apps/server/dist
COPY --from=build /app/apps/web/dist apps/web/dist
USER behavior
VOLUME ["/data"]
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.BEHAVIOR_PORT+'/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/server/dist/main.js"]
