# -------------------------------------------------------------
# Dockerfile Multi-Stage para Next.js 16 em Produção
# Otimizado para Coolify, Hostinger VPS e PostgreSQL
# -------------------------------------------------------------
FROM node:20-alpine AS base

# Fontes são obrigatórias: o sharp (librsvg) usa as fontes do sistema para desenhar
# o texto das capas. Sem elas, o texto sai como quadradinhos (□□□).
RUN apk add --no-cache libc6-compat curl fontconfig ttf-dejavu ttf-liberation font-noto \
    && fc-cache -f
WORKDIR /app

# 1. Dependências
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# 2. Build da Aplicação
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# 3. Runner de Produção
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/lib ./lib

# Garante permissões de escrita para uploads no container
RUN mkdir -p /app/public/uploads /app/.data/uploads /tmp/uploads \
    && chown -R nextjs:nodejs /app/public /app/.data /tmp/uploads \
    && chmod -R 775 /app/public/uploads /app/.data/uploads /tmp/uploads

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:3000/api/status/ || curl -f http://localhost:3000/ || exit 1

CMD ["node_modules/.bin/next", "start", "-p", "3000"]
