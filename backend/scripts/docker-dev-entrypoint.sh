#!/bin/sh
# Runs inside the backend dev container. Every step is safe to repeat:
# `migrate deploy` only applies pending migrations and the seed uses upserts.
set -e

echo "[backend] generating Prisma client"
npx prisma generate

echo "[backend] applying migrations"
npx prisma migrate deploy

echo "[backend] seeding database"
npx prisma db seed

echo "[backend] starting dev server"
exec npm run start:dev
