import axios from 'axios';
import { logger } from './logger';

let lastSentAt = 0;
export async function alertError(message: string, details?: any) {
  const url = process.env.SLACK_WEBHOOK || process.env.SLACK_WEBHOOK_URL;
  if (!url) return;
  const now = Date.now();
  if (now - lastSentAt < 60000) return; // throttle to 1/min
  lastSentAt = now;
  try {
    await axios.post(url, { text: `GalaOS Error: ${message}\n\n\`\`\`${JSON.stringify(details || {}, null, 2)}\n\`\`\`` });
  } catch (e: any) {
    logger.warn({ err: e.message }, 'failed to send slack alert');
  }
}

