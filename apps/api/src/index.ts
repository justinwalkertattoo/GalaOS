import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { env } from './env';
import { appRouter } from './router';
import { createContext } from './context';
import { logger, reqId } from './services/logger';
import { httpRequestsTotal, httpRequestDurationMs, httpErrorsTotal, registry } from './services/metrics';
import { initSentry, captureError } from './services/telemetry';
import { initOtel } from './services/otel';
import { alertError } from './services/alerts';
import IORedis from 'ioredis';
import { prisma } from '@galaos/db';
import { getPluginManager } from '@galaos/core';
import { TattooGuildModule } from '@galaos/tattoo-guild';

// Load environment variables
config();

// Initialize plugin manager and register modules
const pluginManager = getPluginManager(prisma);
pluginManager.register(TattooGuildModule);
logger.info('Registered business modules');

const app = express();
initSentry();
initOtel();
const PORT = env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging + metrics
app.use((req, res, next) => {
  const start = Date.now();
  const id = (req.headers['x-request-id'] as string) || reqId();
  (req as any).id = id;
  res.setHeader('x-request-id', id);
  res.on('finish', () => {
    const duration = Date.now() - start;
    const route = (req as any).route?.path || req.path || req.url;
    const labels = { method: req.method, route, status: String(res.statusCode) } as any;
    httpRequestsTotal.inc(labels);
    httpRequestDurationMs.observe(labels, duration);
    logger.info({ id, method: req.method, url: req.url, status: res.statusCode, duration }, 'request');
  });
  next();
});

// Health checks
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/healthz', (req, res) => {
  res.status(200).send('ok');
});

app.get('/ready', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const rurl = process.env.REDIS_URL;
    if (rurl) {
      const r = new IORedis(rurl);
      await r.ping();
      await r.quit();
    }
    res.json({ ready: true });
  } catch (e: any) {
    res.status(503).json({ ready: false, error: e.message });
  }
});

// Prometheus metrics
app.get('/metrics', async (req, res) => {
  res.setHeader('Content-Type', registry.contentType);
  res.end(await registry.metrics());
});

// tRPC API endpoint
app.use(
  '/trpc',
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// Error handler
app.use((err: any, req: any, res: any, _next: any) => {
  const route = req?.route?.path || req?.path || req?.url || 'unknown';
  httpErrorsTotal.inc({ route });
  logger.error({ err, route, id: req?.id }, 'unhandled_error');
  captureError(err);
  alertError(err?.message || 'Unhandled error', { route, id: req?.id });
  res.status(500).json({ error: 'Internal Server Error', id: req?.id });
});

// Start server
app.listen(PORT, () => {
  logger.info({ port: PORT }, 'GalaOS API started');
  logger.info({ url: `http://localhost:${PORT}/trpc` }, 'tRPC endpoint');
});

export { appRouter, type AppRouter } from './router';
