FROM oven/bun:1 AS base
WORKDIR /usr/src/app

COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun install --frozen-lockfile
RUN bun run build

ENV NODE_ENV=production
ENV PORT=3020
ENV HOSTNAME=0.0.0.0

USER bun
EXPOSE 3020/tcp
CMD ["bun", "run", "start"]
