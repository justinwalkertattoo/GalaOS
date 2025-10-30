# GalaOS Desktop App: Architecture & Packaging

This document defines the desktop application architecture and installer packaging strategy for Windows, macOS, and Linux.

## Goals

- Native-feeling desktop shell that wraps the GalaOS web app.
- Background Docker stack management (start/stop/health) with clear user prompts.
- System tray with quick controls and status.
- Global hotkeys (e.g., Ctrl+Shift+G) to bring the app to front.
- First‑launch onboarding (Docker check, API keys, MCP, permissions, tutorial).

## Architecture

- Shell: Electron (Node 20+, Chromium), using `electron-builder` for cross-platform packaging.
- Main Process responsibilities:
  - Docker Desktop presence check (and link to install if missing).
  - Compose orchestration via `dockerode` + child_process calls to `docker compose`.
  - Health checks on `http://localhost:4000/health` and selected dependencies.
  - System tray & native notifications.
  - Global hotkeys registration.
  - Single-instance lock and deep-link handler.
- Renderer (BrowserWindow): loads `http://localhost:3000` and provides native window chrome, menus, and file associations.
- Configuration: reads `.env` and per-user config stored under platform-appropriate app data dir (AppData, ~/Library/Application Support, ~/.config).

## Installer Flow (MSI/DMG/DEB)

1. User downloads the installer (GalaOS-Setup.exe/.msi on Windows, .dmg on macOS, .deb on Linux).
2. Installer checks for Docker Desktop (Windows/macOS) or `docker` + `docker compose` (Linux). If missing, prompt to install and open download page.
3. Install desktop app, add Start menu/Applications entry, and register auto-start (Login Items / Startup folder / systemd user service if desired).
4. First launch: app starts, spawns Docker stack (Quick Start by default), performs health checks.
5. Opens native window to onboarding wizard.
6. Web UI runs inside native window; tray icon appears.

## First Launch Setup

Wizard pages:
1. Docker health check (status, diagnostics, retry/install links).
2. API keys & OAuth: prompt to add keys or connect via OAuth; supports API key connection for providers that offer it.
3. MCP service discovery: optional enable; set allowlists and token; test a sample action.
4. System permissions: file access on macOS (TCC prompt guide), notifications, auto-start toggle.
5. Welcome tutorial overlay.

## Daily Workflow

- App auto-starts on login; tray icon indicates status.
- Background services: Docker stack runs invisibly.
- Global hotkey Ctrl+Shift+G brings window to foreground.
- Notifications use OS native APIs.
- `.gala` file associations open the app and route to import flow.

## Packaging Strategy

- Tooling: `electron-builder` with multi-target config.
- Windows:
  - Target: NSIS (primary) and MSI (optional). NSIS offers robust auto-update; MSI available for enterprise.
  - Auto-start via registry (Run) or Task Scheduler.
  - Code signing via Authenticode (optional but recommended).
- macOS:
  - Target: DMG.
  - Notarization and code signing (Developer ID) recommended.
  - Auto-start via Login Items.
- Linux:
  - Target: deb (Ubuntu/Debian) and AppImage as a universal alternative.
  - Auto-start via `.desktop` file and systemd user service.

## Electron Project Skeleton

Directory: `desktop/electron/`

- `package.json`: scripts for `dev`, `build`, and `dist` using `electron-builder`.
- `src/main.ts`:
  - Create `BrowserWindow` sized 1280x800.
  - Register global shortcut `Ctrl+Shift+G` (Cmd+Shift+G on macOS).
  - Create tray with menu: Open, Start/Stop Services, Health, Quit.
  - On ready: check Docker, then run `docker compose up -d` with `docker/docker-compose.yml`.
  - Load `http://localhost:3000`.
- `electron-builder.yml`:
  - AppId, productName, icons.
  - Win: `nsis` and `msi` targets; Mac: `dmg`; Linux: `deb` and `AppImage`.
  - File associations for `.gala`.

## Auto-Update

- Use Electron autoUpdater (Squirrel/NSIS) or custom update check calling GalaOS version manager endpoints.
- Updates to the Docker stack still use the in-app update system (pull + rebuild) as documented in DEPLOY.md.

## Security Considerations

- Never run arbitrary shell commands without explicit user enablement.
- MCP integration is opt-in with API key and allowlists.
- Store secrets encrypted at rest; prefer OAuth over raw keys when available.
- Ensure CSP and disable Node integration in renderer; use secure preload.

## Next Steps

1. Scaffold `desktop/electron` with main process code and builder config.
2. Add health-check and compose orchestration helpers.
3. Implement onboarding wizard screens in the web app behind `?onboarding=1` flag.
4. Wire global hotkeys and tray controls.
5. Configure CI to build artifacts per OS.

