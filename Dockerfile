FROM oven/bun:1-alpine AS base
WORKDIR /usr/src/app

FROM base AS builder
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run build

FROM base AS migration-deps
COPY package.migrations.json bun.lock ./
RUN mv package.migrations.json package.json && bun install

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder --chown=bun:bun /usr/src/app/public ./public
COPY --from=builder --chown=bun:bun /usr/src/app/.next/standalone ./
COPY --from=builder --chown=bun:bun /usr/src/app/.next/static ./.next/static
COPY --from=migration-deps --chown=bun:bun /usr/src/app/node_modules ./node_modules
COPY --from=builder --chown=bun:bun /usr/src/app/package.json ./package.json
COPY --from=builder --chown=bun:bun /usr/src/app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder --chown=bun:bun /usr/src/app/docker-entrypoint.sh ./docker-entrypoint.sh
COPY --from=builder --chown=bun:bun /usr/src/app/src/database ./src/database

RUN chmod +x ./docker-entrypoint.sh

USER bun
EXPOSE 3000/tcp
CMD ["sh", "./docker-entrypoint.sh"]
