# main.md

## Product Brief
Invisi Fight is a desktop-first browser multiplayer game where 2–4 friends join a room, hide their movement during planning, use private sonar to infer enemy positions, and then resolve a committed firing order in a fast, round-based showdown. The product solves the problem of making a fair, low-friction party game with high tension from incomplete information, while keeping every match playable end-to-end through an authoritative real-time server.

## Goals
- A player can create a room or join one with a code, enter a display name, and reach an active lobby state in under 60 seconds on a normal desktop connection.
- A room does not start until at least 2 players are present, and the host can manually start the match from the lobby.
- During a planning phase, each player can move with WASD, aim with the mouse, and see only their own character plus private sonar detections and their private aim line.
- Sonar detections are delivered only to the detecting player as fading silhouette snapshots that do not track later movement, and fade timing is controlled from shared constants.
- When planning ends, the server freezes movement and aiming, deterministically separates any overlaps, reveals the firing order, and resolves shots sequentially with visible muzzle flash, shot line, impact effect, and sound.
- A match can conclude with a winner, return to lobby, and start a new match without page reload, while disconnected players can reconnect into the live room state when the server is still running.

## Non-Goals
- No accounts, profiles, persistent progression, stats, leaderboards, or match history.
- No bots, spectators with controls, chat, or public matchmaking.
- No weapons selection, power-ups, obstacles, walls, cover, or map variants.
- No mobile/touch controls or gesture input for v1.
- No custom room settings beyond room creation/joining and host start.
- No offline mode or local-only fallback when the authoritative server is unavailable.
- No replay system, downloadable replays, or post-match timeline scrubber.
- No monetization, ads, cosmetics, analytics, or retention systems in v1.

## Source Notes
Assumptions used: the app is a single monorepo with `client/`, `server/`, `shared/`, and `artifacts/` directories; the build must support anonymous room-based identity with a chosen display name plus a server-issued session token; and only live room state is preserved across refresh/reconnect while the match is active. Open questions that must be confirmed before implementation are limited to operational details not specified here, such as exact Render service naming and GitHub Pages repository subpath, because the client build must be configured to match the actual repo path and production WebSocket endpoint. The gameplay constants that must remain centrally configurable include planning duration, sonar rotation period, wedge width, and silhouette fade duration; these should be defined in shared TypeScript contracts so client and server cannot diverge.

## Monetization Summary
Monetization was not specified, so the recorded assumption is that v1 ships with no revenue model and no value exchange beyond free access to private rooms. Applicability decisions for future monetization or ad support should be documented separately in `payments.md` and `ads.md`, but neither should introduce product behavior for this MVP.

## Files To Create/Edit
| File | Purpose |
|---|---|
| `client/index.html` | Root HTML shell for the Phaser game canvas, lobby UI mount point, and status overlays used by the desktop-first web app. |
| `client/vite.config.ts` | Vite configuration for TypeScript, dev proxying to the Colyseus server, and GitHub Pages base-path handling. |
| `client/src/main.ts` | Client entry point that boots Phaser, routes between lobby and match UI, and wires connection/session state. |
| `client/src/game/GameScene.ts` | Core Phaser scene for rendering the arena, players, sonar wedge, private aim line, silhouettes, shots, and match phases. |
| `client/src/game/ui/*` | DOM or Phaser HUD components for lobby controls, connection status, phase labels, timer, hearts, firing order, winner screen, and replay-to-lobby actions. |
| `client/src/network/colyseusClient.ts` | Client networking wrapper for joining/creating rooms, reconnection, private messages, and endpoint selection between localhost and Render. |
| `client/src/network/session.ts` | Session token and display-name persistence in browser storage so refresh/reconnect can restore the current room identity. |
| `client/src/state/*` | Client-side state coordination for lobby, active match, spectator view, winner flow, and connection waking/retry states. |
| `client/src/config/clientConfig.ts` | Central client config for server endpoint selection, GitHub Pages base path, and runtime environment switches. |
| `client/src/styles/*` | Minimal competitive-game HUD styling with dark mode as the only theme and clear accessibility-oriented contrast. |
| `client/public/*` | Static assets needed by the Phaser client, including any minimal icons or font assets approved for the MVP. |
| `server/src/index.ts` | Node server bootstrap for Colyseus, HTTP/WebSocket setup, health checks, and Render deployment entrypoint. |
| `server/src/rooms/InvisiFightRoom.ts` | Authoritative Colyseus room implementing lobby, planning, resolution, elimination, spectator handling, and reconnection. |
| `server/src/game/*` | Pure server-side game logic for timing, sonar sweeps, ray hits, shot ordering, overlap separation, damage, and win conditions. |
| `server/src/state/*` | Colyseus room state definitions that expose only public match data while keeping private positions/aims restricted. |
| `server/src/messages/*` | Private message schemas for sonar detections, private live position/aim updates, and resolution-only reveal events. |
| `server/src/utils/*` | Deterministic helpers for seeded ordering, server-timestamp phase transitions, and overlap separation rules. |
| `server/src/config/serverConfig.ts` | Server configuration for match timing constants, update rate, and environment-based host/port settings. |
| `shared/src/constants.ts` | Single source of truth for planning duration, sonar rotation, wedge width, fade duration, update cadence, and related tunables. |
| `shared/src/types/*` | Shared TypeScript contracts for room codes, player identity, public state, private events, and phase enums. |
| `shared/src/messages/*` | Shared message payload definitions used by both client and server for typed private/public room events. |
| `shared/src/index.ts` | Shared package barrel exporting all contracts and constants for clean imports in client and server code. |
| `tests/unit/sonarGeometry.test.ts` | Deterministic unit tests for wedge rotation, overlap detection, and silhouette snapshot timing. |
| `tests/unit/rayIntersection.test.ts` | Unit tests for infinite ray casting, first-hit-only behavior, and non-piercing shot resolution. |
| `tests/unit/firingOrder.test.ts` | Unit tests for initial random order selection and per-round rotation by one position. |
| `tests/unit/phaseTransitions.test.ts` | Unit tests for planning, freeze, reveal, resolution, elimination, and winner-state transitions. |
| `tests/integration/roomFlow.test.ts` | Colyseus room integration tests for create/join/start, reconnect, spectator entry, and active-match state sync. |
| `tests/e2e/multibrowser.spec.ts` | Playwright multi-browser coverage for 2–4 players joining the same room and completing a full match. |
| `tests/e2e/deploySmoke.spec.ts` | Smoke tests validating localhost, GitHub Pages client hosting, and Render-hosted server connectivity paths. |
| `playwright.config.ts` | Cross-browser E2E configuration with local and deployed environment targets. |
| `vitest.config.ts` | Test runner setup for shared pure logic, server room logic, and client-side deterministic utilities. |
| `package.json` | Monorepo scripts for client/server dev, build, lint, test, and CI entrypoints. |
| `pnpm-workspace.yaml` | Workspace definition for coordinated installs across `client`, `server`, and `shared`. |
| `tsconfig.base.json` | Shared TypeScript compiler settings used by all packages to keep contracts aligned. |
| `tsconfig.json` | Root TypeScript references/build orchestration for the monorepo. |
| `.github/workflows/ci.yml` | GitHub Actions pipeline for unit tests, integration tests, browser tests, and build verification. |
| `.github/workflows/deploy-client.yml` | GitHub Actions deployment job for publishing the Vite client to GitHub Pages. |
| `.github/workflows/deploy-server.yml` | GitHub Actions deployment job or release workflow support for the Render-hosted server path, including environment checks. |
| `render.yaml` | Render service definition for the authoritative Colyseus server and required environment variables. |
| `README.md` | Project setup notes explaining local dev, environment variables, test commands, and production deployment URLs. |

## Related File Index
| File | Purpose |
|---|---|
| `stack.md` | Documents the monorepo structure, package boundaries, TypeScript setup, and build/test commands for Phaser client and Colyseus server. |
| `architecture.md` | Describes the authoritative multiplayer architecture, server-owned state, private events, reconnection behavior, and deployment topology. |
| `design.md` | Defines the desktop-first HUD, minimal competitive visual style, dark-mode-only presentation, and phase-specific screen composition. |
| `schema.md` | Specifies Colyseus public state models for lobby, match, hearts, timers, firing order, and spectator flags. |
| `auth.md` | Defines anonymous room-based identity, display-name entry, session token handling, and host-only start permissions. |
| `routes.md` | Lists app screens and URL/state transitions for landing lobby, active match, winner view, and replay-to-lobby flow. |
| `components.md` | Breaks down UI components for connection state, room entry, player list, timer, hearts, firing order, labels, and winner actions. |
| `flows.md` | Maps the end-to-end gameplay flow from room creation through planning, resolution, elimination, and rematch. |
| `api.md` | Defines Colyseus room operations, public sync events, private snapshot messages, and reconnection payloads. |
| `payments.md` | Records that v1 has no monetization and only notes how future payment support would be evaluated if introduced later. |
| `ads.md` | Records that v1 has no advertising surfaces and only notes how ad support would be evaluated if introduced later. |
| `state.md` | Details client state machines for lobby, connecting/waking, planning, resolution, spectator, winner, and reconnect handling. |
| `env.md` | Lists environment variables for local dev server URLs, production Render WebSocket endpoint, and GitHub Pages base path. |
| `testing.md` | Defines the TDD strategy and required unit, integration, and multi-browser test coverage for the game rules and networking. |
| `errors.md` | Enumerates user-facing error states like server sleeping, invalid room code, reconnect failure, and match loss after server restart. |
| `i18n.md` | Confirms that v1 uses a single English locale with no translation system, while keeping text centralized for future expansion. |
| `notifications.md` | States that all status is in-app only and there are no push, email, or OS-level notifications in the MVP. |
| `prompts.md` | Documents any developer/operator prompts or debugging commands used to inspect room state, match flow, and deployment health. |
| `tasks.md` | Converts the build plan into independently verifiable implementation tasks ordered by dependency and testability. |