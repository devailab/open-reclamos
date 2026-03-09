FROM oven/bun:1 AS base
WORKDIR /usr/src/app

FROM base AS builder
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run build

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /usr/src/app/public ./public
COPY --from=builder --chown=bun:bun /usr/src/app/.next/standalone ./
COPY --from=builder --chown=bun:bun /usr/src/app/.next/static ./.next/static

USER bun
EXPOSE 3000/tcp
CMD ["bun", "server.js"]
