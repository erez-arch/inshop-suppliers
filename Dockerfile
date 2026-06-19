FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN DATABASE_URL="file:/tmp/build.db" npm run build

RUN mkdir -p /data /app/public/uploads/invoices

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DATABASE_URL=file:/data/prod.db

EXPOSE 3000

CMD sh -c "npx prisma db push --skip-generate && npx tsx prisma/seed.ts && npm start"
