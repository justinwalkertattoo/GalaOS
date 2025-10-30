import * as Sentry from '@sentry/node';
import { logger } from './logger';

let sentryInited = false;
export function initSentry() {
  if (sentryInited) return;
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({ dsn, environment: process.env.NODE_ENV || 'development' });
  sentryInited = true;
  logger.info({ msg: 'Sentry initialized' });
}

export function captureError(err: any) {
  if (!sentryInited) return;
  Sentry.captureException(err);
}

