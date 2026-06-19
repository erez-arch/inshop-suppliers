#!/bin/sh
set -e
mkdir -p /data /app/public/uploads/invoices
echo "==> DB push..."
npx prisma db push --skip-generate
echo "==> Seed..."
npx tsx prisma/seed.ts
echo "==> Start..."
exec npm start
