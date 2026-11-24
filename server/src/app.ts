
import cors from 'cors';
import express from 'express';
import { config, corsOrigin } from './config/all.js';
import { prisma } from './core/prisma.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { adminRouter } from './routes/admin.js';
import { authRouter } from './routes/auth.js';
import { reportsRouter } from './routes/reports.js';
import { usersRouter } from './routes/users.js';
import { workoutsRouter } from './routes/workouts.js';

export function createApp() {
  const app = express();

  app.use(cors({ origin: corsOrigin }));
  app.use(express.json({ limit: config.jsonBodyLimit }));

  // Health check for monitoring / the hosting service. 503 if the database is unreachable.
  app.get('/api/health', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ ok: true, database: 'up', time: new Date().toISOString() });
    } catch {
      res.status(503).json({ ok: false, database: 'down', time: new Date().toISOString() });
    }
  });

  // Authentication - Register and Login
  app.use('/api/auth', authRouter);

  app.use('/api/workouts', workoutsRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/admin', adminRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
