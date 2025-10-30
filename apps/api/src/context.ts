import { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { prisma } from '@galaos/db';
import { dbQueryDurationMs } from './services/metrics';
import jwt from 'jsonwebtoken';
import { JWTPayload } from '@galaos/types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Install Prisma metrics middleware once
let prismaMetricsInstalled = false;
if (!prismaMetricsInstalled) {
  try {
    prisma.$use(async (params, next) => {
      const start = Date.now();
      const result = await next(params);
      const duration = Date.now() - start;
      try {
        dbQueryDurationMs.observe({ model: params.model || 'unknown', action: params.action }, duration);
      } catch {}
      return result;
    });
    prismaMetricsInstalled = true;
  } catch {}
}

export const createContext = async ({ req, res }: CreateExpressContextOptions) => {
  // Get user from JWT token if present
  const token = req.headers.authorization?.replace('Bearer ', '');
  let user = null;

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
      user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          name: true,
          username: true,
          image: true,
        },
      });
    } catch (error) {
      // Invalid token, continue without user
    }
  }

  return {
    req,
    res,
    prisma,
    user,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;
