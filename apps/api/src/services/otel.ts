import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { logger } from './logger';

let initialized = false;
export function initOtel() {
  if (initialized) return;
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!endpoint) return;
  try {
    const traceExporter = new OTLPTraceExporter({ url: `${endpoint}/v1/traces` });
    const sdk = new NodeSDK({
      traceExporter,
      instrumentations: [getNodeAutoInstrumentations({ '@opentelemetry/instrumentation-fs': { enabled: false } })],
    });
    sdk.start();
    initialized = true;
    logger.info({ endpoint }, 'OpenTelemetry initialized');
  } catch (e: any) {
    logger.warn({ err: e?.message }, 'OpenTelemetry init failed');
  }
}

