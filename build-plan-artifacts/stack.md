## Platform
- Desktop-first web app
- Target browsers: current Chromium, Firefox, and Safari desktop releases
- OS targets: Windows 11+, macOS 14+, Ubuntu 22.04+ via modern desktop browsers
- Networked multiplayer requires always-online play; no offline mode
- Assumption: GitHub Pages serves the client at a repository subpath, and Render hosts the authoritative server over `wss://`

## Frontend
- Phaser 3.80.x
- TypeScript 5.6.x
- Vite 5.x
- HTML/CSS for shell UI and HUD overlays
- Colyseus.js 0.15.x for client room connection, state sync, and reconnection
- Zustand 4.x for lightweight UI/session state on the client
- Zod 3.x for validating room endpoint, session token, and contract payloads at the UI boundary

## Backend
- Node.js 20.x
- TypeScript 5.6.x
- Colyseus 0.15.x authoritative server
- Express 4.x for health checks and deployment plumbing
- ws 8.x transitively through Colyseus networking
- seedrandom 3.x for deterministic match-order and resolution helpers where needed
- N/A — no additional backend framework is needed because gameplay authority lives entirely inside Colyseus rooms

## Database / Storage
- Primary database: N/A — no persistent database; the MVP keeps only live room state in memory
- Secondary storage: N/A — no object storage or blob store; match assets are bundled with the client
- Caching layer: N/A — no cache tier; live state is already held in memory inside each room
- Client-side storage strategy: `localStorage` for display name, last-used room code, and server endpoint preference; no saved match data or progression
- Assumption: if Render sleeps or restarts, live room state may be lost and players are returned to the lobby

## Authentication
- Anonymous room-based identity with server-issued session token
- Authentication strategy: players choose a display name, then receive a short-lived room/session token from the Colyseus server for reconnecting to the live room
- Rationale: the MVP explicitly excludes accounts and persistent profiles, but reconnect support is required during active matches

## External Services
- Colyseus Cloud/Protocol runtime via self-hosted Colyseus server on Render — authoritative real-time multiplayer transport and room lifecycle
- Render Free — hosts the Node.js authoritative server in the Singapore region and exposes the secure WebSocket endpoint
- GitHub Pages — hosts the static Phaser client build under the repository subpath
- GitHub Actions — runs CI, tests, and deploy workflows for client and server
- GitHub repository hosting — source control and release coordination for the monorepo

## Build & Tooling
- Bundler: Vite 5.x for the client; `tsup` 8.x for the server build
- Package manager: pnpm 9.x
- Test runner: Vitest 2.x for unit/integration logic; Playwright 1.x for multi-browser E2E
- Linter: ESLint 9.x with `@typescript-eslint/eslint-plugin` 8.x and `@typescript-eslint/parser` 8.x
- Formatter: Prettier 3.x
- CI/CD pipeline: GitHub Actions with separate jobs for shared type-checking, server tests, client tests, Playwright browser tests, GitHub Pages deployment, and Render deploy hook invocation
- Assumption: one monorepo contains `client/`, `server/`, and `shared/` packages to keep shared contracts version-locked

## Banned Patterns
- Client-side authoritative game logic — this would let hidden movement, sonar detection, and shot resolution diverge from the server and break fairness
- Sending opponent live positions to unauthorized clients — violates the core hidden-information design and would nullify planning tension
- Peer-to-peer multiplayer or WebRTC rooms — the server must stay authoritative for deterministic timing, reconnection, and anti-desync behavior
- Persistent database-backed progression, stats, or match history — explicitly out of scope and unnecessary for a session-only prototype
- Chat or public matchmaking — the MVP is room-code based and focuses on fast friend play, not social/discovery features
- Mobile/touch-first UI patterns — the target is desktop-first with mouse aiming and keyboard movement
- Custom room settings UI — excluded from scope and would add complexity without improving the core loop
- Global sonar pulses or shared map reveal mechanics — the product relies on private detection snapshots, not common-knowledge scans
- Physics collision as hidden-information leakage — players must be able to pass through each other, so collision cannot reveal location
- Unbounded animation-driven timing on the client — round timing, sonar rotation, and firing order must be server-timestamped to prevent drift
- Replays or spectating controls — explicitly excluded and would require extra state and UX not needed for the MVP

## Decision Log
- Phaser 3 was chosen over a DOM-only canvas approach because the game needs fast sprite, line, and effect rendering for planning, sonar, muzzle flash, and impact feedback.
- Vite was chosen over Webpack because the client is a small-to-medium real-time game app where fast dev startup and simple GitHub Pages deployment matter more than bundler customization.
- Colyseus was chosen over a custom WebSocket protocol because it directly supports authoritative rooms, state synchronization, private messages, and reconnection, which are core requirements here.
- A monorepo with shared TypeScript contracts was chosen over separate repos because client/server gameplay constants, state shapes, and message contracts must stay tightly aligned.
- `localStorage` was chosen for player name and endpoint preference over any backend persistence because the MVP is session-only and must avoid database overhead.
- Render Free was chosen for server hosting over a self-managed VPS because the build plan explicitly targets a low-cost MVP with a hosted WebSocket endpoint and acceptable sleep/wake behavior.
- GitHub Pages was chosen for client hosting over a custom static host because the product already uses GitHub Actions and benefits from simple repository-based deployment.
- Anonymous room identity with a server-issued session token was chosen over accounts because the game is friends-only, low-friction, and explicitly excludes persistent user profiles.
- Server-owned timing and resolution were chosen over client-side prediction for gameplay events because hidden information, deterministic shot ordering, and fair reconnection depend on one source of truth.
- Private sonar silhouette snapshots were chosen over continuously streaming detected enemy positions because the design requires detection to be momentary, non-tracking, and information-limited.
- Sequential server-side shot resolution with a visible pause between shooters was chosen over simultaneous resolution because the game’s tension depends on readable firing order and post-planning drama.
- A 10-second planning phase and configurable combat constants were chosen over hard-coded values because balancing hidden-movement games is iteration-heavy and must be centrally tunable.
- Rotating the firing order by one position after each round was chosen over re-randomizing every round because it preserves fairness while keeping the order legible and reducing first-shooter bias.
- No offline fallback was chosen because the authoritative multiplayer loop is the product; an offline mode would add a separate rules path without serving the MVP goal.

## Files To Create/Edit
- `package.json` — workspace root scripts, pinned package versions, and shared dev commands for client/server/test/deploy
- `pnpm-workspace.yaml` — defines the monorepo packages `client/`, `server/`, and `shared/`
- `tsconfig.base.json` — shared TypeScript compiler options and path-alias baseline for the monorepo
- `client/package.json` — client dependencies and scripts for Vite, Vitest, and Playwright support
- `client/vite.config.ts` — GitHub Pages subpath base, dev server proxy rules, and build configuration
- `client/index.html` — Vite entry shell and root mount point for Phaser plus HUD overlays
- `client/src/main.ts` — client bootstrap, endpoint selection, and app startup
- `client/src/app/App.ts` — top-level client state machine for landing, lobby, connecting/waking, match, and results
- `client/src/net/colyseusClient.ts` — room connection, reconnection, session token handling, and endpoint selection
- `client/src/game/GameScene.ts` — Phaser scene for player movement, aim line, sonar visuals, firing resolution visuals, and winner presentation
- `client/src/ui/LobbyPanel.tsx` — lobby controls for player name, create room, join room code, host start, and connection status
- `client/src/ui/HudOverlay.tsx` — round timer, hearts, firing order, planning/resolution labels, and winner/replay controls
- `client/src/styles/global.css` — dark-mode-only layout, contrast, and HUD styling
- `client/src/state/useUiStore.ts` — client UI/session state for screen transitions and connection feedback
- `client/src/assets/` — client art/audio assets for muzzle flash, impact effect, and gunshot sound
- `client/test/` — client-side unit tests for UI state and endpoint behavior
- `client/e2e/` — Playwright multi-browser tests for lobby-to-match and reconnect flows
- `server/package.json` — server dependencies and scripts for the authoritative Colyseus host
- `server/src/index.ts` — server bootstrap and HTTP/WebSocket startup
- `server/src/rooms/InvisiFightRoom.ts` — authoritative match room, phase timing, reconnection, and state transitions
- `server/src/game/phaseMachine.ts` — planning/resolution/winner state machine and server-timestamp logic
- `server/src/game/sonar.ts` — sonar wedge rotation, private detection snapshots, and fade timing logic
- `server/src/game/combat.ts` — ray intersections, non-piercing hit resolution, damage, elimination, and overlap separation
- `server/src/game/firingOrder.ts` — initial random order selection and per-round rotation logic
- `server/src/game/constants.ts` — centralized gameplay tuning values shared by client and server
- `server/src/rooms/schema.ts` — Colyseus state schema for public state and private-safe room state
- `server/test/` — Vitest integration tests for room behavior, reconnects, and authoritative sequencing
- `shared/package.json` — shared contract package scripts and exports
- `shared/src/types.ts` — shared player, phase, and payload types
- `shared/src/contracts.ts` — validated client/server message contracts
- `shared/src/constants.ts` — exported gameplay constants consumed by both sides
- `shared/src/index.ts` — barrel export for shared types and constants
- `artifacts/stack.md` — the canonical technical decision record produced by this build plan
- `.github/workflows/ci.yml` — CI pipeline for lint, type-check, unit tests, and Playwright runs
- `.github/workflows/deploy-client.yml` — GitHub Pages deployment workflow for the client build
- `.github/workflows/deploy-server.yml` — Render deploy workflow or webhook trigger for the authoritative server
- `playwright.config.ts` — multi-browser E2E configuration and environment selection
- `vitest.config.ts` — shared Vitest configuration for unit and integration test suites
- `eslint.config.js` — repo-wide lint rules for TypeScript, Phaser client code, and server code
- `prettier.config.cjs` — consistent formatting across all packages
- `.gitignore` — ignores build output, caches, and local environment files