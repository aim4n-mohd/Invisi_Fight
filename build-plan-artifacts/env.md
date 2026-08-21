## Files To Create/Edit

| Path | Why this file is needed |
|---|---|
| `env.md` | Canonical environment-variable and build-configuration reference for the monorepo. |
| `client/.env.example` | Client-side placeholder env file for Vite/GitHub Pages deployment and local development. |
| `server/.env.example` | Server-side placeholder env file for Colyseus/Render deployment and local development. |
| `shared/src/config/gameplayConfig.ts` | Central gameplay constants used by both client and server; values differ by environment only through imports/build-time overrides, never through ad hoc literals. |
| `client/vite.config.ts` | Configures the GitHub Pages subpath base, env loading, and build-time constants for the browser app. |
| `server/src/index.ts` | Loads server environment variables, validates required config, and applies runtime settings for Colyseus, CORS, and health checks. |
| `.github/workflows/ci.yml` | Supplies CI variables/build args for lint, test, build, and deployment jobs. |
| `.github/workflows/deploy-client.yml` | Publishes the built client to GitHub Pages with the correct repository subpath and public base URL. |
| `.github/workflows/deploy-server.yml` | Deploys the authoritative server to Render using CI-managed secrets and environment-specific build settings. |
| `README.md` | Developer-facing setup instructions should reference the same env variables and placeholders as this reference. |

## Environment Variables

| Variable Name | Type | Required | Environments (dev/staging/prod) | Used In (frontend/backend/both) | Description |
|---|---|---:|---|---|---|
| `VITE_APP_NAME` | string | Yes | dev/staging/prod | frontend | Display name shown in the browser UI. For this app it should be `Invisi Fight` everywhere. |
| `VITE_PUBLIC_BASE_PATH` | string | Yes | dev/staging/prod | frontend | Public path that Vite uses for GitHub Pages asset routing. In production this is the repo subpath, e.g. `/invisi-fight/`; local development usually uses `/`. |
| `VITE_SERVER_HTTP_URL` | string | Yes | dev/staging/prod | frontend | Base HTTP(S) URL for the authoritative server REST endpoints used for room create/join/reconnect/start/leave and health checks. |
| `VITE_SERVER_WS_URL` | string | Yes | dev/staging/prod | frontend | WebSocket URL for Colyseus room connections. Local dev uses `ws://...`; production uses `wss://...` on Render. |
| `VITE_DEFAULT_PLAYER_NAME` | string | No | dev/staging/prod | frontend | Placeholder name prefilled in the lobby input for faster local testing; should be empty or a neutral label in production builds. |
| `VITE_ENABLE_DEBUG_OVERLAY` | boolean | No | dev/staging/prod | frontend | Toggles a local-only debugging overlay for FPS/network/state inspection. Production should disable it. |
| `VITE_BUILD_COMMIT_SHA` | string | No | dev/staging/prod | frontend | Injected by CI to show build provenance in logs or hidden diagnostics; useful for deployment verification. |
| `VITE_BUILD_ENV` | string | Yes | dev/staging/prod | frontend | Explicit client build target label (`development`, `staging`, or `production`) used for conditional UI messaging and endpoint selection. |
| `PORT` | number | Yes | dev/staging/prod | backend | HTTP port the Node.js/Colyseus server listens on. Render injects this at runtime; local dev commonly uses `2567` or another free port. |
| `NODE_ENV` | string | Yes | dev/staging/prod | backend | Standard Node environment mode. Used to toggle dev logging, error verbosity, and production-safe defaults. |
| `SERVER_HOST` | string | No | dev/staging/prod | backend | Network bind host for the server process. Local development usually uses `0.0.0.0` or `localhost`; Render typically binds via platform defaults. |
| `SERVER_PUBLIC_URL` | string | Yes | dev/staging/prod | backend | Public HTTPS base URL for the server, used in generated links, reconnect hints, and CORS/origin checks. |
| `CLIENT_PUBLIC_URL` | string | Yes | dev/staging/prod | backend | Public URL of the GitHub Pages client, used for allowed origins, join redirects, and cross-origin safety checks. |
| `CORS_ORIGIN` | string | Yes | dev/staging/prod | backend | Exact allowed browser origin for the frontend. Must match the deployed client URL or local dev origin. |
| `COLYSEUS_SEAT_RESERVATION_TIME` | number | No | dev/staging/prod | backend | Seat reservation/reconnect window in milliseconds for temporary disconnect recovery. Must be aligned with the room’s reconnect policy. |
| `MATCH_RECONNECT_GRACE_MS` | number | Yes | dev/staging/prod | backend | Grace window during which a disconnected player can rejoin their live room state if the server is still running. |
| `MATCH_SPECTATOR_ON_JOIN_WHEN_ACTIVE` | boolean | Yes | dev/staging/prod | backend | Controls the rule that players joining mid-match enter as spectators until the next match. This should remain enabled for MVP. |
| `GITHUB_PAGES_REPO_NAME` | string | Yes | staging/prod | frontend | Repository name used to derive the GitHub Pages subpath when the client is hosted under `https://<user>.github.io/<repo>/`. |
| `RENDER_SERVICE_NAME` | string | Yes | staging/prod | backend | Render service identifier used by deployment scripts and documentation to target the authoritative server service. |
| `RENDER_REGION` | string | Yes | staging/prod | backend | Render deployment region. For this product it should be Singapore to match the build brief. |
| `RENDER_PUBLIC_WSS_URL` | string | Yes | staging/prod | frontend | Canonical secure WebSocket endpoint for production client builds. This is the live Render `wss://` address. |
| `HEALTHCHECK_PATH` | string | No | dev/staging/prod | backend | HTTP path used by CI and the client to confirm the server is awake and healthy. Defaults to `/healthz`. |
| `MATCHMAKING_ROOM_NAME` | string | No | dev/staging/prod | backend | Logical Colyseus room name for the game room implementation. Keeps the room contract explicit in deployments and logs. |
| `LOG_LEVEL` | string | No | dev/staging/prod | backend | Server logging verbosity (`debug`, `info`, `warn`, `error`). Use `debug` locally and stricter levels in production. |
| `RATE_LIMIT_WINDOW_MS` | number | No | dev/staging/prod | backend | Optional HTTP rate-limit window for room and reconnect endpoints; useful for preventing accidental abuse in public deployments. |
| `RATE_LIMIT_MAX_REQUESTS` | number | No | dev/staging/prod | backend | Maximum request count allowed per rate-limit window for non-gameplay endpoints. Keep conservative for the MVP. |
| `GAMEPLAY_PLANNING_DURATION_MS` | number | Yes | dev/staging/prod | both | Master planning phase duration. This is centrally configurable and must match server timing and client UI display. |
| `GAMEPLAY_SONAR_ROTATION_PERIOD_MS` | number | Yes | dev/staging/prod | both | Time for one full sonar sweep rotation around a player. Used for both server-side detection timing and client rendering. |
| `GAMEPLAY_SONAR_WEDGE_DEGREES` | number | Yes | dev/staging/prod | both | Angular width of the private sonar wedge. Must be centralized for balancing. |
| `GAMEPLAY_SONAR_FADE_MS` | number | Yes | dev/staging/prod | both | Fade duration for private sonar silhouette snapshots after detection. |
| `GAMEPLAY_SHOT_RESOLUTION_PAUSE_MS` | number | Yes | dev/staging/prod | both | Short pause between shooters during resolution, while each shot itself remains instant. |
| `GAMEPLAY_MAX_PLAYERS_TEST_TARGET` | number | No | dev/staging/prod | both | Non-enforced test target for validation focus. This brief targets 2–4 players most heavily while leaving the MVP uncapped. |
| `GAMEPLAY_PLAYER_HEARTS` | number | Yes | dev/staging/prod | both | Starting hearts per player. The MVP uses three hearts. |
| `GAMEPLAY_NETWORK_UPDATE_HZ` | number | Yes | dev/staging/prod | both | Network update frequency target used to tune sync cadence, typically around 10–15 updates per second. |
| `GAMEPLAY_LOCKED_SHOT_RANGE_PX` | number | No | dev/staging/prod | both | Infinite-shot implementation hint for client/server math. It should be large enough to span the arena but still deterministic in tests. |
| `GAMEPLAY_OVERLAP_SEPARATION_PX` | number | Yes | dev/staging/prod | both | Deterministic separation distance used when players overlap at phase end. |
| `GAMEPLAY_ARENA_WIDTH_PX` | number | Yes | dev/staging/prod | both | Width of the open arena used by client rendering and server simulation. |
| `GAMEPLAY_ARENA_HEIGHT_PX` | number | Yes | dev/staging/prod | both | Height of the open arena used by client rendering and server simulation. |
| `VITE_ENABLE_AUDIO` | boolean | No | dev/staging/prod | frontend | Allows local testing of gunshot and UI SFX. Production should typically keep this enabled, but it can be disabled for automated visual runs. |
| `PLAYWRIGHT_BASE_URL` | string | Yes | dev/staging/prod | frontend | Base URL for E2E tests; points to local dev server, preview deployment, or GitHub Pages depending on the pipeline stage. |
| `PLAYWRIGHT_WS_URL` | string | Yes | dev/staging/prod | frontend | WebSocket endpoint used by browser E2E tests to connect to the authoritative server in the target environment. |
| `VITEST_COVERAGE` | boolean | No | dev/staging/prod | both | Enables coverage reporting in test jobs. Useful in CI, optional locally. |
| `CI` | boolean | No | dev/staging/prod | both | Standard CI marker used by tooling to select non-interactive defaults, stricter assertions, and deterministic build paths. |

## Build Config

### Mechanism Summary
- **Vite `.env` files** for the client:
  - `client/.env.development`
  - `client/.env.staging`
  - `client/.env.production`
  - `client/.env.example`
- **Node runtime environment variables** for the server:
  - `server/.env.development`
  - `server/.env.staging`
  - `server/.env.production`
  - `server/.env.example`
- **Shared gameplay constants** in `shared/src/config/gameplayConfig.ts`:
  - Central source of truth for match timing, sonar geometry, hearts, update cadence, separation distance, and reconnect windows.
- **Build-time constants injected by CI**:
  - `VITE_BUILD_COMMIT_SHA`
  - `VITE_BUILD_ENV`
  - `GITHUB_PAGES_REPO_NAME`
  - `RENDER_PUBLIC_WSS_URL`
- **GitHub Actions variables**:
  - Used to set the correct base path, endpoints, and deployment targets per workflow job.
- **Render service environment variables**:
  - Used at runtime for the authoritative server only; no client secrets are required in the browser.

### Environment-Differentiated

Build Values
- **Development**
  - Client base path: `/`
  - Server WebSocket URL: local `ws://localhost:<port>`
  - Server HTTP URL: local `http://localhost:<port>`
  - Debug overlay: enabled
  - Logging: verbose
  - Purpose: iterative gameplay testing and TDD
- **Staging**
  - Client base path: GitHub Pages preview or branch-deploy subpath
  - Server WebSocket URL: Render staging `wss://` endpoint
  - Server HTTP URL: Render staging HTTPS endpoint
  - Debug overlay: optional, typically disabled for playtest realism
  - Purpose: browser validation, reconnect checks, and friends-only playtest verification
- **Production**
  - Client base path: repository subpath on GitHub Pages
  - Server WebSocket URL: production Render `wss://` endpoint
  - Server HTTP URL: production Render HTTPS endpoint
  - Debug overlay: disabled
  - Logging: info/warn only
  - Purpose: stable internal prototype delivery

### Build-Time Constants That Must Not Drift
- `GAMEPLAY_PLANNING_DURATION_MS`
- `GAMEPLAY_SONAR_ROTATION_PERIOD_MS`
- `GAMEPLAY_SONAR_WEDGE_DEGREES`
- `GAMEPLAY_SONAR_FADE_MS`
- `GAMEPLAY_SHOT_RESOLUTION_PAUSE_MS`
- `GAMEPLAY_PLAYER_HEARTS`
- `GAMEPLAY_NETWORK_UPDATE_HZ`
- `GAMEPLAY_OVERLAP_SEPARATION_PX`
- `GAMEPLAY_ARENA_WIDTH_PX`
- `GAMEPLAY_ARENA_HEIGHT_PX`

### GitHub Pages Configuration
- Set Vite `base` to `/${GITHUB_PAGES_REPO_NAME}/` for production builds.
- Local development should keep `base` at `/` so asset URLs resolve correctly on `localhost`.
- The client must read the server endpoint from `VITE_SERVER_HTTP_URL` and `VITE_SERVER_WS_URL`; do not hardcode GitHub Pages or Render URLs in source.
- Assumption stated inline: because the client is hosted on GitHub Pages and the server on Render, production builds must be compiled with the repository subpath and secure WebSocket URL baked in at build time.

### Colyseus/Server Runtime Configuration
- `PORT` should be sourced from the hosting platform.
- `SERVER_PUBLIC_URL` and `CLIENT_PUBLIC_URL` should be validated on startup and used for redirects, CORS, and reconnect metadata.
- `CORS_ORIGIN` should exactly match the deployed frontend origin to avoid cross-origin connection failures.
- `COLYSEUS_SEAT_RESERVATION_TIME` and `MATCH_RECONNECT_GRACE_MS` should remain aligned so temporary disconnects and browser refreshes are handled consistently.
- Server-side gameplay logic must consume shared constants rather than environment-specific hardcoded values.

### CI/CD Variable Usage
- **GitHub Actions build job**
  - Sets `NODE_ENV=production`
  - Sets `VITE_BUILD_ENV=production`
  - Injects `VITE_BUILD_COMMIT_SHA`
  - Sets `VITE_PUBLIC_BASE_PATH` from repo name
- **GitHub Pages deploy job**
  - Uses the compiled client bundle only; no runtime secret injection into the browser
- **Render deploy job**
  - Sets runtime server environment variables from the Render dashboard or secret store
  - Uses `RENDER_REGION=singapore`
  - Publishes the authoritative server with `wss://` support

## Environments

### Local
-

**Purpose:** fast inner-loop development for client, server, and shared logic running together on one machine.
-

**Deployment target:** developer workstation via `pnpm`/`npm` scripts, local Vite dev server, and local Colyseus server.
- **Environment-specific behavior:** HTTP and WebSocket endpoints point to `localhost`; debug overlay can be enabled; verbose logs and test fixtures are allowed; Render wake state is simulated only if desired.

### Development
-

**Purpose:** integrated branch builds for verifying code changes before playtest deployment.
-

**Deployment target:** local CI preview or developer-hosted instances matching production config closely.
- **Environment-specific behavior:** uses the same repo structure and shared contracts, but with dev endpoints, easy logging, and optional debug UI for state inspection.

### Staging
-

**Purpose:** friends-only playtest and release candidate validation before production-like use.
-

**Deployment target:** GitHub Pages preview for the client plus a Render staging instance for the authoritative server, or equivalent branch-based preview targets.
- **Environment-specific behavior:** client uses the staging `wss://` server URL, base path reflects the preview path, and the “Connecting/Waking multiplayer server” state should be exercised because Render Free may sleep.

### Production
-

**Purpose:** primary MVP delivery target for the internal playtest prototype.
-

**Deployment target:** GitHub Pages for the client and Render Free in the Singapore region for the server.
- **Environment-specific behavior:** strict secure endpoints, production base path, no debug overlay, minimized logging, and authoritative server recovery/reconnect behavior fully enabled.

### Preview
-

**Purpose:** optional PR or branch preview for QA and browser testing.
-

**Deployment target:** ephemeral GitHub Actions artifact or deployment preview, plus a disposable server instance if needed.
- **Environment-specific behavior:** may use temporary endpoint variables, but must still preserve secure `wss://` access and the same gameplay constants.

## Secret Handling Rules

-

**Hard constraint:** secrets must never be committed to source control.
- Store secrets in:
  - GitHub Actions encrypted secrets for CI/CD
  - Render secret/environment variables for the authoritative server
  - A local untracked `.env` file for developer machines
- Never place real values in:
  - `client/.env.example`
  - `server/.env.example`
  - `README.md`
  - source code comments
  - test snapshots
- Treat these as sensitive if introduced later:
  - session tokens
  - any admin or deployment tokens
  - private service URLs if they contain embedded credentials
- If a secret is accidentally exposed:
  1. Revoke or rotate it immediately in the originating system.
  2. Remove it from the repository history if committed.
  3. Purge it from CI logs, issue threads, and deployment artifacts where possible.
  4. Redeploy affected environments with fresh credentials.
  5. Document the incident in the project’s internal notes so the same class of secret is not reused.
- For this MVP, the browser client should not require any secret at build time; any token used for room/session identity must be server-issued and short-lived.

## .env.example

### `client/.env.example`
```env
VITE_APP_NAME=Invisi Fight

# Browser title and lobby branding; set to the product name for all environments.
VITE_PUBLIC_BASE_PATH=/

# Vite public base path; use "/" locally and "/<repo-name>/" on GitHub Pages, sourced from the repo name.
VITE_SERVER_HTTP_URL=http://localhost:2567

# HTTP API base for room lifecycle and health checks; use the local Colyseus/Express server URL or the deployed HTTPS server URL.
VITE_SERVER_WS_URL=ws://localhost:2567

# WebSocket endpoint for Colyseus room connections; use local ws:// for development and Render's wss:// URL in production.
VITE_DEFAULT_PLAYER_NAME=Player

# Prefilled lobby name for quick local testing; choose any friendly placeholder name.
VITE_ENABLE_DEBUG_OVERLAY=true

# Enables a developer overlay for network/state debugging; keep false in production builds.
VITE_BUILD_COMMIT_SHA=local-dev

# Build provenance label injected by CI; local placeholder only.
VITE_BUILD_ENV=development

# Explicit client build target; set to development, staging, or production to match the build.
VITE_ENABLE_AUDIO=true

# Enables match sound effects such as gunshot and UI clicks; can be toggled for automated testing.
VITE_GITHUB_PAGES_REPO_NAME=invisi-fight

# Repository name used to construct the GitHub Pages subpath; set from the actual repo name in production builds.
VITE_RENDER_PUBLIC_WSS_URL=wss://your-render-service.onrender.com

# Secure production WebSocket endpoint for Render; replace with the deployed service URL in staging/production.
PLAYWRIGHT_BASE_URL=http://localhost:4173

# Base URL used by browser E2E tests when running against a local preview server.
PLAYWRIGHT_WS_URL=ws://localhost:2567

# WebSocket URL used by Playwright multiplayer tests; point this at the local authoritative server when testing locally.
VITEST_COVERAGE=false

# Enables test coverage reporting; set true in CI when coverage artifacts are desired.
CI=false

# Standard CI marker for local runs; set true automatically in CI environments.
```

### `server/.env.example`
```env
PORT=2567

# HTTP/WebSocket port for the authoritative server; Render injects this at runtime, local development can use any free port.
NODE_ENV=development

# Node runtime mode that controls logging and production-safe defaults; set to production in deployed environments.
SERVER_HOST=0.0.0.0

# Network bind host for the server process; use 0.0.0.0 for local LAN access or platform defaults in hosting.
SERVER_PUBLIC_URL=http://localhost:2567

# Public server URL used for health links, redirects, and reconnection metadata; set to the Render HTTPS URL in production.
CLIENT_PUBLIC_URL=http://localhost:4173

# Public client URL used for CORS and cross-origin checks; set to the GitHub Pages origin in production.
CORS_ORIGIN=http://localhost:4173

# Allowed browser origin for the frontend; must exactly match the client origin to permit connections.
COLYSEUS_SEAT_RESERVATION_TIME=15000

# Reconnect/seat reservation window in milliseconds; should align with the room's disconnect recovery behavior.
MATCH_RECONNECT_GRACE_MS=15000

# Grace period for reconnecting into a live room after a temporary disconnect; keep consistent with seat reservation timing.
MATCH_SPECTATOR_ON_JOIN_WHEN_ACTIVE=true

# Ensures late joiners enter as spectators during an active match; keep enabled for this MVP.
HEALTHCHECK_PATH=/healthz

# HTTP health endpoint path used by CI and hosting checks; keep the default unless platform routing changes.
MATCHMAKING_ROOM_NAME=invisi_fight

# Logical room name used by Colyseus for the main match room; should match the room class registration.
LOG_LEVEL=debug

# Server log verbosity; use debug locally and info/warn in production.
RATE_LIMIT_WINDOW_MS=60000

# Optional rate-limit window for HTTP endpoints; adjust if deploys need stricter or looser protection.
RATE_LIMIT_MAX_REQUESTS=120

# Max HTTP requests allowed per rate-limit window; conservative safeguard for non-gameplay endpoints.
GAMEPLAY_PLANNING_DURATION_MS=10000

# Planning phase length in milliseconds; controls the 10-second planning timer shown to players.
GAMEPLAY_SONAR_ROTATION_PERIOD_MS=2000

# Time for one full sonar sweep rotation; controls the private wedge animation and detection cadence.
GAMEPLAY_SONAR_WEDGE_DEGREES=35

# Angular width of the sonar wedge; used by detection logic and client visualization.
GAMEPLAY_SONAR_FADE_MS=1250

# Fade duration for detected silhouettes; controls how long a detection remains visible to the detecting player.
GAMEPLAY_SHOT_RESOLUTION_PAUSE_MS=350

# Short pause between sequential shooters during resolution; each shot remains instant.
GAMEPLAY_PLAYER_HEARTS=3

# Number of hearts each player starts with; the MVP uses three hearts.
GAMEPLAY_NETWORK_UPDATE_HZ=12

# Target state update frequency per second; balances smooth interpolation and bandwidth.
GAMEPLAY_LOCKED_SHOT_RANGE_PX=5000

# Effectively infinite shot range for arena-sized ray casts; large enough to span the map.
GAMEPLAY_OVERLAP_SEPARATION_PX=12

# Deterministic separation distance used when players overlap at phase end.
GAMEPLAY_ARENA_WIDTH_PX=960

# Width of the open top-down arena in pixels; use the shared default unless balancing changes it.
GAMEPLAY_ARENA_HEIGHT_PX=540

# Height of the open top-down arena in pixels; use the shared default unless balancing changes it.
```