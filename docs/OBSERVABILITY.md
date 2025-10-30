# Observability One‑Pager (Prometheus, Grafana, Sentry, OTEL)

This guide shows how to enable metrics, logs, and traces for GalaOS.

The API already exposes Prometheus metrics and integrates with Sentry and OpenTelemetry via environment variables.

## Endpoints and Env Vars
- API metrics: `http://<api-host>:3001/metrics`
- Health: `http://<api-host>:3001/healthz` and `/ready`
- Sentry: set `SENTRY_DSN`
- OpenTelemetry (OTLP/HTTP): set `OTEL_EXPORTER_OTLP_ENDPOINT` (e.g. `http://otel-collector:4318`)

## Prometheus Scrape Config

Minimal `prometheus.yml` snippet to scrape GalaOS API metrics:

```
scrape_configs:
  - job_name: 'galaos-api'
    scrape_interval: 15s
    metrics_path: /metrics
    static_configs:
      - targets: ['api:3001']   # replace with host/IP if not using Compose
```

Docker Compose example (Prometheus service):

```
services:
  prometheus:
    image: prom/prometheus:v2
    ports: ["9090:9090"]
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
    command:
      - --config.file=/etc/prometheus/prometheus.yml
```

Kubernetes example (Service + scrape annotation):

```
apiVersion: v1
kind: Service
metadata:
  name: galaos-api
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "3001"
    prometheus.io/path: "/metrics"
spec:
  selector:
    app: galaos-api
  ports:
    - name: http
      port: 3001
      targetPort: 3001
```

Verify locally:
- Open `http://localhost:3001/metrics` and confirm metrics are emitted.

## Grafana Dashboard

- Import dashboard JSON from `dashboards/grafana-galaos.json`.
- In Grafana: Dashboards → Import → Upload JSON → select a Prometheus datasource.
- Panels included:
  - HTTP Request Rate (`http_requests_total`)
  - HTTP Duration p95 (`http_request_duration_ms_bucket`)
  - DB Query Duration p95 (`db_query_duration_ms_bucket`)
  - HTTP 5xx Errors (`http_errors_total`)

## Sentry (Errors)

The API initializes Sentry when `SENTRY_DSN` is set:

```
SENTRY_DSN=https://<key>@o<org>.ingest.sentry.io/<project>
NODE_ENV=production
```

Restart the API and trigger an error to verify events appear in Sentry.

## OpenTelemetry (Traces)

The API enables OTEL when `OTEL_EXPORTER_OTLP_ENDPOINT` is set. It uses OTLP/HTTP to export traces.

Example with an OTEL Collector:

```
services:
  otel-collector:
    image: otel/opentelemetry-collector:0.98.0
    command: ["--config=/etc/otel-collector-config.yaml"]
    volumes:
      - ./otel-collector-config.yaml:/etc/otel-collector-config.yaml:ro
    ports:
      - "4317:4317"  # OTLP gRPC
      - "4318:4318"  # OTLP HTTP

  api:
    environment:
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
```

Minimal `otel-collector-config.yaml` forwarding traces to Grafana Tempo or Jaeger:

```
receivers:
  otlp:
    protocols:
      http:
      grpc:

exporters:
  otlphttp/tempo:
    endpoint: http://tempo:4318
  jaeger:
    endpoint: jaeger:14250
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [otlphttp/tempo]  # or [jaeger]
```

## Quick Checklist
- [ ] Prometheus scrapes `api:3001/metrics`
- [ ] Grafana imports `dashboards/grafana-galaos.json`
- [ ] `SENTRY_DSN` set and errors appear in Sentry
- [ ] `OTEL_EXPORTER_OTLP_ENDPOINT` set and traces arrive in your backend

