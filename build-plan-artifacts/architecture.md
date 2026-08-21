# architecture.md

## Folder Structure

```text
.
├── artifacts/

# Supplied build plans, reference notes, and generated design artifacts that are not shipped to runtime.
├── client/

# Phaser 3 game client, lobby UI, HUD overlays, and browser-only session state.
│   ├── public/

# Static files copied as-is by Vite, including icons and any GitHub Pages-root assets.
│   └── src/

# Client application source code, split by bootstrapping, screens, gameplay, UI, and networking.
│       ├── assets/

# Static images, audio, and sprite atlases used by the client; keep runtime-safe assets here.
│       │   ├── audio/

# SFX such as gunshots and UI clicks; loaded by Phaser during scene bootstrap.
│       │   ├── fonts/

# Webfont files if needed for HUD readability; keep the default style minimal and crisp.
│       │   └── sprites/

# Minimal visual assets for players, silhouettes, muzzle flashes, and impact effects.
│       ├── components/

# Reusable React-less UI primitives for shell/lobby/HUD composition rendered with DOM/CSS.
│       │   ├── hud/

# Match HUD widgets like timer, hearts, phase labels, firing order, and status banners.
│       │   ├── lobby/

# Landing and room-join UI pieces such as name entry, room code input, and host controls.
│       │   └── overlays/

# Shared overlay primitives for centered alerts, banners, and reconnect/waking panels.
│       ├── config/

# Client-only environment parsing and computed runtime settings.
│       ├── game/

# Phaser game bootstrap, scenes, cameras, input, rendering, interpolation, and visual effects.
│       │   ├── scenes/

# Phaser scene classes for loading, match play, and resolution/winner presentation.
│       │   ├── objects/

# In-scene render objects for players, aim lines, silhouettes, projectiles, and VFX.
│       │   ├── systems/

# Client-side render systems such as interpolation, aim visualization, and effect timing.
│       │   └── ui/

# Phaser-adjacent HUD adapters if any game-scene-driven overlays are required.
│       ├── network/

# Colyseus client room connection, private event handlers, reconnection, and endpoint selection.
│       ├── screens/

# Top-level screens matching product navigation: landing, lobby, match, results, and reconnect.
│       ├── state/

# Zustand stores for local UI/session data, current room metadata, and transient client flags.
│       ├── styles/

# Global CSS, layout primitives, dark-mode theme tokens, and accessibility-safe status colors.
│       ├── types/

# Client-local types that extend shared contracts without duplicating server-authoritative logic.
│       ├── utils/

# Pure client helpers for formatting, timers, Zod validation, and DOM/Phaser glue code.
│       ├── main.ts

# Vite entry point that mounts the DOM shell, initializes config, and boots the client.
│       └── app.ts

# Root application composition and navigation coordinator between lobby, match, and results.
├── server/

# Authoritative Colyseus server, room lifecycle, simulation logic, and integration tests.
│   ├── src/

# Server source code with room state, handlers, services, and server bootstrap.
│   │   ├── config/

# Server environment parsing, runtime flags, and Render/GitHub Actions-specific configuration.
│   │   ├── rooms/

# Colyseus room implementations and the authoritative match lifecycle.
│   │   │   ├── InvisiFightRoom.ts

# Main game room that owns match phases, state sync, private events, and reconnection.
│   │   │   └── schemas/

# Colyseus schema definitions for public room state shared with clients.
│   │   ├── game/

# Pure deterministic game rules: sonar, shots, overlap resolution, rotation, damage, and win logic.
│   │   │   ├── geometry/

# Ray, wedge, distance, and intersection helpers used by game simulation.
│   │   │   ├── rounds/

# Phase transition and sequential shot-resolution logic.
│   │   │   └── balance/

# Centralized tuning values used by server-authoritative gameplay.
│   │   ├── services/

# Server-side services for sessions, room codes, timestamps, and reconnection support.
│   │   ├── messages/

# Private message builders and validators for sonar snapshots, active shooter, and shot outcomes.
│   │   ├── persistence/

# In-memory match/session adapters only; no database because the MVP is session-based.
│   │   ├── scripts/

# Operational scripts for local boot, smoke checks, or seeding test rooms.
│   │   ├── index.ts

# Server entry point that creates the Colyseus app and listens on the configured port.
│   │   └── app.ts

# Server application assembly, room registration, middleware, and health endpoints.
│   └── test/

# Server integration and room-level tests covering join, reconnect, phase flow, and match rules.
├── shared/

# Shared TypeScript contracts, gameplay constants, and validated payload definitions.
│   ├── src/

# Shared source imported by both client and server.
│   │   ├── constants/

# Centrally managed gameplay values: timing, sonar, health, movement, and network rates.
│   │   ├── contracts/

# Shared room state shapes, private event payloads, and public message types.
│   │   ├── schemas/

# Zod schemas for endpoint, token, and payload validation at the client boundary.
│   │   ├── types/

# Shared domain types such as room codes, phases, player IDs, and fire-order entries.
│   │   └── utils/

# Pure helpers safe for both client and server, especially geometry/math used in tests.
│   └── index.ts

# Shared package barrel for carefully controlled imports from client and server.
├── test/

# Cross-cutting test harness, Playwright fixtures, and multi-browser E2E specs.
│   ├── e2e/

# Playwright tests for lobby, matchmaking, gameplay flow, reconnect, and browser parity.
│   ├── fixtures/

# Shared test helpers, mock endpoints, seeded room states, and browser session utilities.
│   └── setup/

# Global Playwright/Vitest setup, polyfills, and environment preparation scripts.
├── .github/

# GitHub workflow definitions for CI and deployment.
│   └── workflows/

# Automated pipelines for linting, unit/integration tests, client deploy, and server deploy.
├── package.json

# Root workspace scripts for coordinated client/server/shared/test commands.
├── pnpm-workspace.yaml

# Workspace declaration so shared contracts stay versioned with both app halves.
├── vite.config.ts

# Root Vite config for client build, repository subpath handling, and environment aliasing.
├── tsconfig.base.json

# Shared TypeScript compiler options used by client, server, and tests.
├── vitest.config.ts

# Root Vitest config for unit and integration test discovery across packages.
├── playwright.config.ts

# Root Playwright config for multi-browser end-to-end coverage.
├── eslint.config.mjs

# Lint rules enforcing module boundaries, naming, and no-cross-layer imports.
├── .env.example

# Documented environment variables for local development and deployment parity.
└── README.md

# Developer-facing setup guide; not a runtime artifact.
```

## Module Boundaries

- `shared/src/constants`
  - Owns: all gameplay tuning values, timing windows, health counts, and network cadence defaults.
  - Exposes: `GAMEPLAY_CONSTANTS`, `SONAR_CONSTANTS`, `ROUND_CONSTANTS`, `NETWORK_CONSTANTS`.
  - Must never import from: `client/`, `server/`, or any file that depends on runtime environment state.

- `shared/src/contracts`
  - Owns: public room state shapes, private event payloads, room lifecycle messages, and authoritative session contracts.
  - Exposes: `RoomStateContract`, `PlayerStateContract`, `PrivateSonarSnapshot`, `ShotResolutionEvent`, `MatchPhase`.
  - Must never import from: Phaser, Colyseus runtime classes, DOM APIs, or scene/UI modules.

- `shared/src/schemas`
  - Owns: Zod schemas for validating endpoint URLs, session tokens, room codes, and message payloads at boundaries.
  - Exposes: parsers/guards such as `endpointSchema`, `sessionTokenSchema`, `roomCodeSchema`, `privateEventSchema`.
  - Must never import from: client state stores, server room logic, or rendering code.

- `shared/src/utils`
  - Owns: pure deterministic helpers shared by both sides, especially geometry math and ordering helpers.
  - Exposes: functions like `computeSonarWedge`, `rayCircleFirstHit`, `rotateFireOrder`, `deterministicOverlapSeparation`.
  - Must never import from: browser-only APIs, Colyseus schemas, Phaser scenes, or environment loaders.

- `client/src/network`
  - Owns: Colyseus client connection, reconnection, endpoint selection, session token management, and private message handling.
  - Exposes: `connectToRoom`, `disconnectFromRoom`, `useRoomConnection`, `applyPrivateEvent`, `resolveServerEndpoint`.
  - Must never import from: server room classes, server-only schemas, filesystem code, or any `render`/`colyseus` server entrypoint.

- `client/src/state`
  - Owns: local UI/session state that is not authoritative, including screen selection, modal visibility, and connection status.
  - Exposes: Zustand hooks/stores like `useAppStore`, `useLobbyStore`, `useMatchUiStore`.
  - Must never import from: Phaser scene internals, server game logic, or shared server-only helpers.

- `client/src/game`
  - Owns: Phaser scene lifecycle, rendering, input capture, interpolation, visual effects, and HUD-adjacent in-game presentation.
  - Exposes: scene classes, sprite factories, effect runners, and interpolation utilities used by the UI layer.
  - Must never import from: Colyseus server code, DOM-only application shell, or server state mutation functions.

- `client/src/screens`
  - Owns: screen orchestration for landing, lobby, in-match, results, and reconnect/waking states.
  - Exposes: screen entry components/controllers used by `app.ts`.
  - Must never import from: server room implementation, direct filesystem access, or raw browser globals without a helper.

- `client/src/components`
  - Owns: reusable DOM HUD and lobby components that are presentation-only and screen-agnostic.
  - Exposes: `Button`, `TextField`, `StatusBanner`, `RoomCodePanel`, `HeartRow`, `FiringOrderStrip`.
  - Must never import from: Phaser scenes, server logic, or direct network connection code.

- `server/src/rooms`
  - Owns: Colyseus room lifecycle, state sync, phase timing, host start gating, reconnection, and authoritative transition orchestration.
  - Exposes: `InvisiFightRoom` and room schema definitions.
  - Must never import from: client UI modules, browser globals, or DOM-specific code.

- `server/src/game`
  - Owns: deterministic server-authoritative simulation and rules for sonar, movement freeze, damage, elimination, and firing order rotation.
  - Exposes: pure functions and rule services for hit resolution, overlap separation, phase progression, and round winner checks.
  - Must never import from: Colyseus transport, browser APIs, client state stores, or rendering assets.

- `server/src/messages`
  - Owns: validation and creation of private messages sent to one client or a subset of clients.
  - Exposes: message builders for sonar snapshots, active shooter labels, shot results, and reconnect payloads.
  - Must never import from: Phaser, DOM, or client-side stores.

- `server/src/services`
  - Owns: session token issuance/lookup, room code generation, timestamp helpers, and reconnect bookkeeping.
  - Exposes: service functions consumed by rooms and startup code.
  - Must never import from: client or shared UI state.

- `test/`
  - Owns: browser-automation tests, cross-browser scenarios, shared fixtures, and environment bootstrapping.
  - Exposes: Playwright specs and reusable test utilities.
  - Must never import from: production entrypoints that mutate process state unless the test explicitly boots them.

## Naming Conventions

- **Files**
  - Rule: Use `kebab-case` for all non-class files; name files by responsibility, not by technology.
  - Example: `server/src/game/rounds/rotate-fire-order.ts`.

- **Folders**
  - Rule: Use lowercase `kebab-case` folders; never use plural nouns for singleton runtime layers unless the folder contains repeated entities.
  - Example: `client/src/screens/reconnect/`.

- **Components**
  - Rule: Use `PascalCase` for component filenames and exported component symbols.
  - Example: `client/src/components/hud/HeartRow.tsx`.

- **Functions**
  - Rule: Use `camelCase` and make the name describe a single action or derived value.
  - Example: `computeSonarDetectionWindow()`.

- **Custom hooks**
  - Rule: Prefix every hook with `use` and keep them side-effect focused.
  - Example: `useRoomConnection()`.

- **Types/interfaces**
  - Rule: Use `PascalCase` and suffix server/client boundary DTOs with `Contract`, state objects with `State`, and event payloads with `Event`.
  - Example: `MatchStateContract`, `PlayerState`, `PrivateSonarSnapshotEvent`.

- **Constants**
  - Rule: Use `UPPER_SNAKE_CASE` and group related values into exported const objects when they belong to the same balancing domain.
  - Example: `ROUND_CONSTANTS.PLANNING_DURATION_MS`.

- **Enums**
  - Rule: Prefer string-literal unions in shared contracts; if an enum is unavoidable in a single runtime layer, use `PascalCase` enum names and `UPPER_SNAKE_CASE` values.
  - Example: `type MatchPhase = 'lobby' | 'planning' | 'resolution' | 'results';`.

- **Test files**
  - Rule: Name unit tests `*.test.ts` and end-to-end tests `*.spec.ts`; mirror the source path for discoverability.
  - Example: `server/src/game/geometry/ray-circle-first-hit.test.ts` and `test/e2e/join-and-play.spec.ts`.

## Extension Rules

### Add a New Screen
1. Create a new screen directory under `client/src/screens/<screen-name>/` and keep all screen-specific UI, controller logic, and screen-local styles together.
2. Add the screen entry point to `client/src/screens/index.ts` if one exists, or wire it directly through `client/src/app.ts`.
3. If the screen needs persistent UI state, add a dedicated Zustand slice in `client/src/state/` rather than storing it inside Phaser scenes.
4. If the screen needs game rendering, add a Phaser scene in `client/src/game/scenes/` and mount it from the screen controller.
5. Add any screen-specific reusable presentation pieces to `client/src/components/` only if they will be used by at least two screens.
6. Add unit or Playwright coverage for the navigation path that reaches the new screen.

### Add a New Reusable Component
1. Place the component in the narrowest fitting `client/src/components/<domain>/` folder.
2. Keep it presentation-only; it may receive state and callbacks, but it must not connect to the server or mutate global stores directly.
3. Export it from a local `index.ts` barrel only when the folder contains more than one reusable component.
4. Add matching CSS classes in `client/src/styles/` if the component introduces a shared visual pattern.
5. Write a focused component test only if the component contains non-trivial branching or formatting logic.
6. Prefer a single responsibility name tied to the visible UI element, such as `FiringOrderStrip` for the planning HUD.

### Add a New API Endpoint
1. Decide whether the endpoint belongs to the Colyseus room protocol or to the server HTTP app in `server/src/app.ts`; for this product, gameplay interactions should stay in the room protocol unless they are operational health checks.
2. Add the HTTP route or room message handler on the server first, and validate its input with a shared Zod schema in `shared/src/schemas/`.
3. Add the matching client method in `client/src/network/` and make it the only code path that can call the endpoint or message.
4. If the endpoint changes shared state, update the Colyseus schema in `server/src/rooms/schemas/` and the corresponding client read model.
5. Add a unit test for the pure rule or parser, plus an integration test for the server handler, and an E2E check only if the endpoint affects visible flow.
6. Never expose invisible enemy positions through a public endpoint; private gameplay data must remain room-scoped or private-message-scoped.

### Add a New Data Model
1. Define the canonical shape in `shared/src/contracts/` if both client and server need to read it.
2. Add validation in `shared/src/schemas/` if the model crosses the network or is reconstructed from input.
3. Add the authoritative implementation to `server/src/rooms/schemas/` when the server must synchronize it, or to `server/src/game/` when it is purely deterministic logic.
4. Add a client read/view model in `client/src/types/` only if the UI needs a simplified or derived shape.
5. Update any room serializers, private message builders, and reconnection payloads impacted by the model.
6. Back the model with deterministic unit tests before wiring it into scenes or screens.

## Key Patterns

- **Feature-sliced architecture** — Chosen for the client so lobby, reconnect, HUD, and gameplay code stay isolated and independently testable while sharing a small set of presentation primitives.
- **Layered architecture** — Chosen for shared, client, and server modules so UI, networking, domain rules, and transport concerns remain separated and easy to reason about.
- **Authoritative server pattern** — Chosen because hidden movement, private sonar, committed shots, and elimination must be owned by the server to prevent cheating and preserve fairness.
- **Repository-style pure domain functions** — Chosen for deterministic game logic so sonar geometry, ray hits, firing-order rotation, and phase transitions can be unit-tested without Colyseus or Phaser.
- **Observer/event-driven room state sync** — Chosen because Colyseus naturally broadcasts public state while private messages deliver only room-scoped or player-scoped updates.
- **State machine pattern** — Chosen for match flow because lobby, planning, resolution, results, and reconnect/waking states are explicit and easier to validate against timing rules.
- **Presentation/controller split** — Chosen for the client UI because the DOM shell and Phaser scene responsibilities must stay separate from connection and match orchestration.

## Files To Create/Edit

- `package.json` — Root workspace scripts for client, server, shared, tests, and CI entrypoints.
- `pnpm-workspace.yaml` — Workspace declaration for coordinated monorepo dependency management.
- `tsconfig.base.json` — Shared TypeScript options and path mapping for client/server/shared imports.
- `vite.config.ts` — Vite build config, GitHub Pages subpath handling, and production endpoint injection.
- `vitest.config.ts` — Test discovery and environment setup for unit/integration tests across packages.
- `playwright.config.ts` — Multi-browser E2E configuration for Chromium, Firefox, and WebKit/Safari desktop targets.
- `eslint.config.mjs` — Import boundary and naming enforcement across the monorepo.
- `.github/workflows/ci.yml` — Continuous integration for lint, typecheck, Vitest, and Playwright on pull requests.
- `.github/workflows/deploy-client.yml` — GitHub Pages deployment workflow for the static client build.
- `.github/workflows/deploy-server.yml` — Render deployment workflow or build validation for the authoritative server.
- `.env.example` — Canonical environment variable documentation for local development and deployment parity.
- `README.md` — Setup and run instructions for developers and playtesters.

- `client/index.html` — Vite HTML entry shell for the desktop-first app and mounting root.
- `client/vite.config.ts` — Client-specific build settings if the workspace separates client config from root config.
- `client/src/main.ts` — Browser entry that boots config, store, routing, and Phaser integration.
- `client/src/app.ts` — Top-level screen orchestration between landing, lobby, match, reconnect, and results.
- `client/src/config/env.ts` — Validates server endpoint, GitHub Pages base path, and runtime flags with Zod.
- `client/src/network/connection.ts` — Colyseus client setup, reconnection, and endpoint selection.
- `client/src/network/private-events.ts` — Handlers for private sonar snapshots and resolution-only events.
- `client/src/state/useAppStore.ts` — Global UI/session store for screen state, connection status, and room metadata.
- `client/src/state/useMatchUiStore.ts` — Match HUD state for timer, hearts, firing order, and phase labels.
- `client/src/screens/landing/LandingScreen.tsx` — First-launch landing flow with player name and create/join actions.
- `client/src/screens/lobby/LobbyScreen.tsx` — Room lobby with player list, host start, and readiness/connection status.
- `client/src/screens/match/MatchScreen.tsx` — Active match screen that composes Phaser view plus planning/resolution HUD.
- `client/src/screens/reconnect/ReconnectScreen.tsx` — Waking/reconnecting state for sleeping Render servers and temporary disconnects.
- `client/src/screens/results/ResultsScreen.tsx` — Winner display and replay-to-lobby flow.
- `client/src/components/hud/HeartRow.tsx` — Three-heart health display for active players and spectators.
- `client/src/components/hud/FiringOrderStrip.tsx` — Planning HUD showing upcoming firing order and active shooter state.
- `client/src/components/lobby/RoomCodePanel.tsx` — Room code display/copy control for the lobby.
- `client/src/components/overlays/StatusBanner.tsx` — Reusable connection and match-status messaging panel.
- `client/src/game/scenes/BootScene.ts` — Phaser startup, asset loading, and scene registration.
- `client/src/game/scenes/MatchScene.ts` — Core gameplay scene for movement, aim line, silhouettes, and resolution visuals.
- `client/src/game/objects/PlayerSprite.ts` — Player rendering and interpolation anchor for the local or visible player.
- `client/src/game/objects/SonarSilhouette.ts` — Fading snapshot silhouette object for private detections.
- `client/src/game/objects/AimLine.ts` — Private aim-line rendering from player to cursor.
- `client/src/game/systems/interpolation.ts` — Client smoothing logic for public movement updates.
- `client/src/styles/global.css` — Dark-mode global shell, HUD typography, and layout primitives.
- `client/src/styles/theme.css` — Shared color tokens and contrast-safe status palette.

- `server/src/index.ts` — Server runtime entrypoint.
- `server/src/app.ts` — HTTP app assembly and health endpoints for operational checks.
- `server/src/config/env.ts` — Validates server port, CORS, and deployment environment.
- `server/src/rooms/InvisiFightRoom.ts` — Authoritative Colyseus room implementation.
- `server/src/rooms/schemas/MatchState.ts` — Public room state schema synchronized to clients.
- `server/src/game/balance/constants.ts` — Server-side gameplay constants mirrored from shared values where appropriate.
- `server/src/game/geometry/ray-circle-first-hit.ts` — Deterministic shot intersection logic.
- `server/src/game/geometry/sonar-wedge-intersection.ts` — Sonar detection geometry used by the authoritative simulation.
- `server/src/game/rounds/rotate-fire-order.ts` — Rotation logic for fair firing-order distribution across rounds.
- `server/src/game/rounds/resolve-planning-phase.ts` — Phase transition logic from planning to resolution.
- `server/src/game/rounds/resolve-shots.ts` — Sequential shot resolution, damage, elimination, and cancellation rules.
- `server/src/services/room-code.service.ts` — Random room-code generation and validation.
- `server/src/services/session.service.ts` — Anonymous session token issuance and reconnect bookkeeping.
- `server/src/messages/private-events.ts` — Builders for private sonar, active shooter, and shot-resolution events.
- `server/test/invisi-fight-room.test.ts` — Colyseus room integration tests for join, start, reconnect, and match completion.

- `shared/src/constants/gameplay.ts` — Central gameplay tuning used by both client visuals and server rules.
- `shared/src/contracts/match.ts` — Shared match, player, phase, and firing-order contracts.
- `shared/src/contracts/private-events.ts` — Shared private-message payload contracts.
- `shared/src/schemas/network.ts` — Zod validation for endpoints, room codes, session tokens, and room messages.
- `shared/src/utils/geometry.ts` — Pure geometry helpers reused by client tests and server rule tests.
- `shared/index.ts` — Shared package barrel for explicit cross-package imports.

- `test/e2e/join-create-play.spec.ts` — Cross-browser flow from landing through match completion and replay-to-lobby.
- `test/e2e/reconnect.spec.ts` — Reconnect and waking-server behavior against a sleeping or interrupted room.
- `test/fixtures/multiplayer.ts` — Shared Playwright helpers for spawning multiple browser contexts and room sessions.
- `test/setup/global.ts` — Global E2E setup and environment bootstrap.

## Assumptions

- Monetization is out of scope; the MVP is free-to-play with no payment or commerce surfaces, which keeps the architecture focused on the authoritative multiplayer loop.
- Because replays, match history, spectator controls, and custom room settings are explicitly excluded, the data model should remain session-scoped and in-memory only, with no persistence layer beyond reconnect state while the room lives.
- Since GitHub Pages serves the client from a repository subpath, the client build must use a configured Vite base path and derive the Render server endpoint from environment variables rather than hardcoding URLs.
- Since Render Free may sleep, the client must surface a dedicated waking/retrying state and continue reconnect attempts until the authoritative room is available again or the user leaves the session.
- Because the product is desktop-first and anonymous, all identity is room-scoped display name plus server-issued session token, with no account system or profile storage.