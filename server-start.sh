#!/bin/sh
export DATABASE_URL="${DATABASE_URL:-file:./prisma/prod.db}"
npx prisma db push --skip-generate
npx tsx prisma/seed.ts
exec npx next start -p "${PORT:-3000}"
