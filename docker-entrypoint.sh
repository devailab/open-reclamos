#!/bin/sh
set -eu

bun run db:migrate
bun run db:seed

exec bun server.js
