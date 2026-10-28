# syntax=docker/dockerfile:1

# 1. frontend: compila React con Vite
FROM oven/bun:1.3.14 AS web

WORKDIR /src

COPY package.json bun.lock ./
COPY apps/web/package.json apps/web/
COPY packages/rpc-client/package.json packages/rpc-client/

RUN bun install --frozen-lockfile

COPY apps/web apps/web
COPY packages/rpc-client packages/rpc-client

RUN bun run --cwd apps/web build

# 2. backend: embebe el frontend y compila un solo binario estático
FROM golang:1.26-alpine AS api

WORKDIR /src/apps/api

COPY apps/api/go.mod apps/api/go.sum ./

RUN go mod download

COPY apps/api ./
COPY --from=web /src/apps/web/dist/ internal/shared/assets/web/

ARG VERSION=dev

RUN CGO_ENABLED=0 go build -trimpath \
    -ldflags "-s -w -X main.version=${VERSION}" \
    -o /out/open-reclamos ./cmd/open-reclamos

# 3. imagen final: solo el binario
FROM alpine:3.22

RUN apk add --no-cache ca-certificates tzdata \
    && adduser -D -u 10001 app \
    && mkdir /data \
    && chown app /data

COPY --from=api /out/open-reclamos /usr/local/bin/open-reclamos

ENV HTTP_ADDR=0.0.0.0:8080 \
    PUBLIC_BASE_URL=http://localhost:8080 \
    SQLITE_PATH=/data/open-reclamos.db \
    STORAGE_LOCAL_DIR=/data/files \
    JWT_KEY_FILE=/data/jwt-keys.json

USER app

VOLUME /data
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
    CMD wget -q -O /dev/null http://127.0.0.1:8080/health/live || exit 1

CMD ["sh", "-c", "open-reclamos migrate && open-reclamos seed && exec open-reclamos serve"]
