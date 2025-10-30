Private / Offline Mode Checklist

Repo Strategy
- Keep a private GitHub mirror for backups and PRs.
- Use a self-hosted primary remote (Gitea/GitLab/bare git) for day-to-day and air-gapped work.

Dependencies
- NPM: set up Verdaccio/Nexus; point .npmrc to local registry.
- Docker: pre-pull and save images; load into offline host/registry.
- Puppeteer: either skip download or point to a local Chrome.

Models
- Ollama: pull models online, copy ~/.ollama/models to offline box; or use models.pullOllamaModel against a LAN Ollama.
- Docker models: save/load images; mount weights from local storage.

Secrets & Telemetry
- Store secrets only in .env; never commit.
- Disable telemetry: NEXT_TELEMETRY_DISABLED=1, TURBO_TELEMETRY_DISABLED=1.
- Add secret scanning (gitleaks) locally.

CI/CD
- Use a local runner (GitLab CI/Jenkins/Drone) with:
  - Local git remote
  - Local npm/Docker registries
  - Cached node_modules and build artifacts

PR Flow
- Push branches to gala/*; GitHub Action opens PRs automatically (private repo).
- Use scripts/pr-helper.js to create/push branches with an ephemeral token.

Networking
- Default-deny outbound on air-gapped hosts; allow only local registries/services.
- Mirror external artifacts proactively.

Disaster Recovery
- Regular backups of repository, npm cache, Docker registry, and model weights with checksums.

