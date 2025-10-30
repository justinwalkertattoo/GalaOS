Claude Code Setup (Private/Local)

Goals
- Keep code private while using Claude for assistance.
- Prefer local/editor usage to avoid repo exposure.

Recommended Modes
- Local editor mode (Claude Desktop / VS Code extension)
  - Open your local GalaOS folder; do not connect GitHub.
  - Configure extension to only read opened files on demand.
  - Avoid pasting secrets; keep .env files closed.

- GitHub-connected (private repo)
  - Keep repo private; add Claude with least-privilege scopes.
  - Use a bot account for PRs; restrict to a single repo.
  - Never store API keys or secrets in git; use .env locally.

Scopes (GitHub App or PAT)
- contents: read/write (required for PRs)
- pull_requests: read/write
- metadata: read
- Avoid org-wide scopes; bind to a single repo/project.

Operational Tips
- Use branch prefixes like gala/feature-xyz to trigger automation only when intended.
- Run local tests and audits before pushing.
- Use the provided PR helper script to push branches without exposing tokens in repo.

Data Privacy
- Claude API requests are not used to train by default; review Anthropic’s latest policy.
- Keep conversations free of secrets; refer to environment variables rather than values.

