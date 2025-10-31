# GalaOS Dev Protocol (Draft)

Purpose: A living specification that guides how GalaOS learns, adapts, and remains safe and reliable while enabling rapid innovation.

## Principles
- User-first, explainable actions; irreversible steps require confirmation.
- Cost-aware by default; budgets and rate limits are enforced.
- Privacy by design; explicit, user-editable memory only.
- Simplicity and modularity; small, testable units.

## Memory Model
- Explicit write/read via a Memory/Artifact service (no raw table writes).
- User controls: view/edit/delete remembered facts.

## Governance & Safety
- Minimal scopes; outbound domain allowlists; SSRF/URL validation.
- Secrets in KMS; encryption at rest; key rotation.
- Audit trails with requestId, userId, workspaceId, agentId.

## Observability
- Metrics: costs, retries, latency, connector health.
- Tracing: end-to-end request correlation.
- Dashboards: reliability and ROI views.

## Execution Engine
- Idempotency keys; checkpoints; DLQ; time-travel replay.

## Sandbox (AEthernet)
- SANDBOX_MODE=true for dry-run connectors.
- Real-time event stream (SSE/WebSockets); record/replay.

## Extensibility
- Runes (tools) and Mods (apps) as versioned manifests.
- Text-to-function routing with capability negotiation.

## Threat Model (Outline)
- Input validation; injection/SSRF defenses; dependency and image scanning.

## Update Process
- Feature flags; ADRs for cross-cutting decisions; rollbacks documented.

