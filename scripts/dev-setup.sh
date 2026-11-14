#!/bin/sh
# One-command dev environment: checks Docker, creates .env if missing, starts the stack.
set -e
cd "$(dirname "$0")/.."

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose v2 is required: https://docs.docker.com/compose/install/" >&2
  exit 1
fi

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example (set GITHUB_TOKEN there if you need it)."
fi

exec docker compose -f docker-compose.dev.yml up --build "$@"
