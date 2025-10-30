import { z } from 'zod';

const base = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  REDIS_URL: z.string().url().optional(),
  DATABASE_URL: z.string().url().optional(),
});

export const env = (() => {
  const parsed = base.safeParse(process.env);
  if (!parsed.success) {
    throw new Error('Invalid environment variables (worker): ' + JSON.stringify(parsed.error.format()));
  }
  const e = parsed.data;
  if (e.NODE_ENV === 'production') {
    if (!e.REDIS_URL) throw new Error('REDIS_URL is required in production');
    if (!e.DATABASE_URL) throw new Error('DATABASE_URL is required in production');
  }
  return e;
})();

