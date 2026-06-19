FROM node:20-slim
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN DATABASE_URL="file:/tmp/build.db" npx next build

RUN mkdir -p /app/public/uploads/invoices

ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL=file:./prisma/prod.db

EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push --skip-generate && npx tsx prisma/seed.ts && npx next start -p ${PORT:-3000}"]
