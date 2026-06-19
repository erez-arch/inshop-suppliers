import express from 'express';
import session from 'express-session';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { correlationId } from './middleware/correlationId';
import { errorHandler } from './middleware/errorHandler';
import v1Router from './api/v1/router';
import prisma from './db';

const app = express();
const PORT = parseInt(process.env.PORT ?? '3001', 10);

// Security
app.use(
  helmet({
    contentSecurityPolicy: false, // handled by client
    crossOriginEmbedderPolicy: false,
  })
);

// CORS — allow React dev server
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  })
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Session
app.use(
  session({
    secret: process.env.SESSION_SECRET ?? 'dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
      sameSite: 'lax',
    },
  })
);

// Correlation ID header
app.use(correlationId);

// Serve uploaded files (private — validate via auth in production)
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads');
app.use('/uploads', express.static(UPLOAD_DIR));

// API routes
app.use('/api/v1', v1Router);

// Serve React client in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(process.cwd(), '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Error handler (must be last)
app.use(errorHandler);

async function main() {
  try {
    await prisma.$connect();
    console.log('[DB] Connected to SQLite database');
    app.listen(PORT, () => {
      console.log(`[Server] INSHOP Suppliers running on http://localhost:${PORT}`);
      console.log(`[Server] API available at http://localhost:${PORT}/api/v1`);
    });
  } catch (err) {
    console.error('[Server] Failed to start:', err);
    process.exit(1);
  }
}

main();

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

export default app;
