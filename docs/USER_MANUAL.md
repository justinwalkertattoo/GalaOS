# GalaOS User Manual

Welcome to GalaOS — your AI operating system. This guide helps you get productive quickly with setup, prompting, integrations, automation, safety, and troubleshooting.

## Getting Started
- Sign in and open the Web app.
- System Health: visit `/system` to verify API/DB/Redis and env configuration.
- Usage & Limits: visit `/admin/usage` to view spend and set budgets/quotas.
- Generators: visit `/generators` to scaffold features and packages.
- Agent Exec (superuser): visit `/admin/agent` to run commands, edit files, and fetch resources with safeguards.

## Key Concepts
- Orchestrator: plans tasks and routes to tools and agents.
- Generators: code scaffolds for new packages and Next.js features.
- Capability Auditor: checks for missing tools/integrations and suggests actions.
- Observations: logs model inputs/outputs for learning and future tuning.
- Safety & Policy: gates high‑impact actions unless you approve.

## Prompting Tips
- Be explicit about end goals and constraints.
- Provide examples and formats; set max tokens to control cost.
- Ask for plans first: “Create a plan with steps; wait for my OK.”
- Use focus words for cost/speed: “Prefer smaller models for drafts.”

## Integrations
- API Keys: set `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` in `.env`.
- Local Models: use Ollama or Docker providers; manage under Models API.
- Slack Alerts: set `SLACK_WEBHOOK` to receive incident notifications.
- Tracing: set `OTEL_EXPORTER_OTLP_ENDPOINT` to enable distributed tracing.

## Limits & Budgets
- Set daily/monthly caps on `/admin/usage`.
- Enforced on chat/orchestration; rate limits protect endpoints.
- Dashboard shows trends, breakdown by provider, and forecast.

## Safety & Overrides
- Superuser: set `DEV_SUPERUSER_EMAIL` (or `DEV_SUPERUSER_ID`) in `.env`.
- FS allowlist: set `FS_ALLOWED_DIRS` for safe read/write paths.
- Network allow/block: `NET_ALLOWED_HOSTS` / `NET_BLOCKED_HOSTS`.
- Override checkboxes in admin UI bypass safeguards for superuser only.

## Agent Exec
- Run commands with timeouts/output caps.
- Read/Write/Move/Delete files (allow‑listed or override).
- Fetch network resources with allow/block lists (or override).
- All actions are logged to `.galaos-logs` with decisions and results.

## Troubleshooting
- Check `/system` for structure/env/service issues.
- Check `/metrics` and Grafana dashboard for performance.
- See `.galaos-logs` for action/audit traces.
- Enable Sentry (SENTRY_DSN) for error details; Redis for distributed rate limits.

## FAQ
- “How do I add a new feature?” → Open `/generators` and select Next.js Feature.
- “How do I reduce costs?” → See `/admin/usage` suggestions and lower max tokens.
- “How do I use local models?” → Add Ollama/Docker providers in Models, then select them in settings.
- “How do I allow file edits outside the repo?” → Add absolute paths to `FS_ALLOWED_DIRS` or use superuser override.

