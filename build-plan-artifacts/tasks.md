## Files To Create/Edit

| Path | Why this file is needed |
|---|---|
| `package.json` | Root workspace scripts for install, dev, test, build, lint, and deployment coordination. |
| `pnpm-workspace.yaml` | Declares the monorepo packages for client, server, and shared code. |
| `tsconfig.base.json` | Shared TypeScript compiler settings for all workspace packages. |
| `eslint.config.js` | Repository-wide lint rules for TypeScript, Phaser client code, and Node server code. |
| `prettier.config.cjs` | Shared formatting rules to keep client/server/shared code consistent. |
| `.github/workflows/ci.yml` | CI pipeline for linting, type-checking, unit/integration tests, and build verification. |
| `.github/workflows/deploy-client.yml` | GitHub Pages deployment for the Vite client with the correct repository subpath. |
| `.github/workflows/deploy-server.yml` | Render deployment workflow for the authoritative Colyseus server. |
| `README.md` | Developer setup, env vars, local run instructions, and deployment notes. |
| `client/package.json` | Client package dependencies and scripts for Vite, Phaser, Vitest, and Playwright. |
| `client/vite.config.ts` | Vite base path, env wiring, and build config for GitHub Pages. |
| `client/index.html` | Browser entry HTML shell for the Phaser app and lobby overlays. |
| `client/src/main.ts` | Client bootstrap, app mount, and initial connection/session restore flow. |
| `client/src/app/App.ts` | Top-level app composition and screen switching. |
| `client/src/app/Router.ts` | Screen routing between landing, lobby, match, reconnect, and results states. |
| `client/src/app/screens/LandingScreen.ts` | Name entry, create-room, join-room, and wake/connecting UI. |
| `client/src/app/screens/LobbyScreen.ts` | Room lobby with player list, room code, connection status, and host start. |
| `client/src/app/screens/MatchScreen.ts` | Planning/resolution HUD, timer, hearts, firing order, and gameplay labels. |
| `client/src/app/screens/ResultsScreen.ts` | Winner display and replay-to-lobby flow. |
| `client/src/app/screens/ConnectingScreen.ts` | “Connecting/Waking multiplayer server” retry state for sleeping Render servers. |
| `client/src/app/screens/SpectatorScreen.ts` | Read-only spectator view for late joins, eliminated players, and reconnect fallback. |
| `client/src/network/colyseusClient.ts` | Client networking adapter for create/join/reconnect, input send, and private messages. |
| `client/src/state/sessionStore.ts` | Browser session identity, selected name, room code, and reconnect token. |
| `client/src/state/uiStore.ts` | Screen-level UI state for lobby, match, reconnect, and results transitions. |
| `client/src/state/connectionStore.ts` | Connection lifecycle, retry state, and room metadata. |
| `client/src/state/matchViewStore.ts` | Client-side interpolation buffers and transient match view state. |
| `client/src/state/privateSnapshotStore.ts` | Private sonar detections and private aim preview state. |
| `client/src/styles/design-tokens.css` | CSS custom properties for dark-only theme and HUD styling. |
| `client/src/styles/global.css` | Base layout, typography, responsive shell, and accessibility styles. |
| `client/src/ui/theme.ts` | Typed design tokens for Phaser-adjacent UI logic. |
| `client/src/components/ui/Button.tsx` | Shared button primitive for lobby and HUD actions. |
| `client/src/components/ui/Input.tsx` | Shared text input primitive for name and room code entry. |
| `client/src/components/ui/Badge.tsx` | Compact status/firing-order/phase indicators. |
| `client/src/components/hud/StatusBanner.tsx` | Match phase and connection status banner. |
| `client/src/components/hud/TimerDisplay.tsx` | Planning and resolution countdown display. |
| `client/src/components/hud/HeartMeter.tsx` | Three-heart health display. |
| `client/src/components/hud/FiringOrderPanel.tsx` | Upcoming and active shooter order display. |
| `client/src/components/hud/PhaseLabel.tsx` | Planning vs resolution labels and winner states. |
| `client/src/game/PhaserGame.ts` | Phaser game bootstrap and scene registration. |
| `client/src/game/scenes/BootScene.ts` | Scene bootstrapping and asset preloading. |
| `client/src/game/scenes/ArenaScene.ts` | Top-down arena rendering, player sprites, sonar, and shot effects. |
| `client/src/game/systems/RenderSystem.ts` | Render/update bridge between Colyseus state and Phaser objects. |
| `client/src/game/systems/SonarRenderSystem.ts` | Sonar wedge and fading silhouette rendering. |
| `client/src/game/systems/AimRenderSystem.ts` | Private aim line and locked firing line rendering. |
| `client/src/game/systems/InterpolationSystem.ts` | Smooth client-side interpolation for server-synced positions. |
| `client/src/game/systems/EffectsSystem.ts` | Muzzle flash, impact effect, and shot line visuals. |
| `client/src/game/assets/` | Placeholder asset directory for sprites, audio, and minimal visual effects. |
| `client/tests/` | Client unit and component tests for screen/state/render behavior. |
| `client/e2e/` | Playwright end-to-end tests for multi-browser multiplayer flows. |
| `server/package.json` | Server dependencies and scripts for Colyseus, TypeScript, and Vitest. |
| `server/src/index.ts` | Server bootstrap, health check, CORS, env config, and Colyseus transport. |
| `server/src/rooms/InvisiFightRoom.ts` | Authoritative room state machine and match lifecycle. |
| `server/src/rooms/InvisiFightRoomState.ts` | Colyseus state schema for public room and player state. |
| `server/src/rooms/InvisiFightRoomMessages.ts` | Private message contracts for sonar snapshots, shots, and reconnect events. |
| `server/src/services/MatchClock.ts` | Server-timestamped phase timing and scheduling. |
| `server/src/services/SonarService.ts` | Deterministic sonar sweep and detection generation. |
| `server/src/services/CombatResolver.ts` | Locked-shot resolution, ray hits, overlap separation, and elimination logic. |
| `server/src/services/FiringOrderService.ts` | Initial random order and round-to-round order rotation. |
| `server/src/services/SessionService.ts` | Anonymous room session token issuance and verification. |
| `server/src/services/RoomAuthService.ts` | Join/start authorization and spectator assignment rules. |
| `server/src/systems/reconnect.ts` | Reconnect handling and fallback-to-lobby behavior if in-memory match state is lost. |
| `server/tests/` | Server unit and room integration tests. |
| `shared/package.json` | Shared package dependencies and build scripts. |
| `shared/src/config/gameplayConfig.ts` | Central gameplay constants for sonar, planning, fade, timing, hearts, and update cadence. |
| `shared/src/config/ui.ts` | Shared UI timing and layout constants. |
| `shared/src/types/match.ts` | Shared match state, player state, input, and event contracts. |
| `shared/src/types/network.ts` | Shared network envelopes and auth/reconnect payload types. |
| `shared/tests/` | Shared logic tests for geometry, contracts, timing, and order rotation. |
| `playwright.config.ts` | Root Playwright config for multi-browser E2E against localhost and deployed targets. |
| `vitest.workspace.ts` | Workspace test runner config for client, server, and shared suites. |
| `render.yaml` | Render service definition for the authoritative server. |

## Phase 0 — Setup

- [ ] **[PHASE-001] Initialize monorepo workspace and package scripts** — Create the root workspace, package boundaries, and top-level scripts for dev, test, lint, and build across client, server, and shared packages. `Depends:` `Ref: architecture.md#folder-structure`
- [ ] **[PHASE-002] Configure shared TypeScript and lint/format tooling** — Add base TypeScript, ESLint, and Prettier config files so all packages compile and format consistently. `Depends: PHASE-001` `Ref: stack.md#build--tooling`
- [ ] **[PHASE-003] Add CI workflow for validation on pull requests** — Wire GitHub Actions to run type-check, lint, unit tests, and build verification for all workspace packages. `Depends: PHASE-001, PHASE-002` `Ref: env.md#ci/cd-variable-usage`
- [ ] **[PHASE-004] Create client/server/shared package shells** — Scaffold the three workspace packages with initial source trees, scripts, and placeholder exports to support incremental implementation. `Depends: PHASE-001, PHASE-002` `Ref: architecture.md#folder-structure`
- [ ] **[PHASE-005] Add root documentation and local development instructions** — Document install, local run, environment setup, and repo layout so the app can be bootstrapped without guesswork. `Depends: PHASE-001, PHASE-002` `Ref: env.md#local`
- [ ] **[PHASE-006] Configure deployment manifests for GitHub Pages and Render** — Add the client Pages workflow, server deployment workflow, and Render service definition with environment-aware settings. `Depends: PHASE-001, PHASE-003` `Ref: env.md#github-pages-configuration`

## Phase 1 — Foundation

- [ ] **[PHASE-007] Define shared gameplay constants and network contracts** — Implement centralized gameplay timing, hearts, sonar, phase, and update-rate constants plus shared match/network types. `Depends: PHASE-004` `Ref: schema.md#json-contracts`
- [ ] **[PHASE-008] Build server bootstrap with health check and Colyseus wiring** — Stand up the Node/Colyseus server entrypoint, CORS, environment config, and `/healthz` endpoint. `Depends: PHASE-004, PHASE-007` `Ref: api.md#backend-endpoints`
- [ ] **[PHASE-009] Implement anonymous session issuance and join authorization** — Add room-based identity token handling, join validation, and host-only start gating for anonymous players. `Depends: PHASE-008, PHASE-007` `Ref: auth.md#identity-model`
- [ ] **[PHASE-010] Create the authoritative room state schema** — Model public room, player, phase, and reconnection state in Colyseus schema objects. `Depends: PHASE-008, PHASE-007` `Ref: schema.md#collection-playerstate`
- [ ] **[PHASE-011] Scaffold client app bootstrap and route shell** — Mount the Phaser canvas and DOM shell with routing between landing, lobby, match, results, reconnect, and spectator states. `Depends: PHASE-004, PHASE-007` `Ref: routes.md#route-tree`
- [ ] **[PHASE-012] Add dark-only design tokens and base UI primitives** — Implement the shared CSS tokens, global styling, and reusable button/input/badge primitives for the HUD and lobby. `Depends: PHASE-004, PHASE-007` `Ref: design.md#color-tokens`
- [ ] **[PHASE-013] Implement client connection/session stores** — Add browser session, UI, connection, and private snapshot state stores to support reconnect and room lifecycle flow. `Depends: PHASE-011, PHASE-009` `Ref: state.md#state-stores`
- [ ] **[PHASE-014] Add client networking adapter for create/join/reconnect** — Connect the client to Colyseus with typed create, join, reconnect, and private-message handling. `Depends: PHASE-009, PHASE-010, PHASE-013` `Ref: api.md#sdk-callback-contracts`

## Phase 2 — Core Features

### Landing, Lobby, and Room Entry

- [ ] **[PHASE-015] Build landing screen for name entry and room actions** — Ship the landing lobby that accepts a display name, supports create/join, and surfaces connection state. `Depends: PHASE-012, PHASE-013, PHASE-014` `Ref: flows.md#landing--create-room--join-room-flow`
- [ ] **[PHASE-016] Build lobby screen with room code, player list, and host start** — Show joined players, room code, host-only start control, and pre-match waiting feedback. `Depends: PHASE-015, PHASE-009, PHASE-010` `Ref: routes.md#route-tree`
- [ ] **[PHASE-017] Implement room creation and join flow end to end** — Allow a player to create a room or join by code, transition into the lobby, and preserve session identity. `Depends: PHASE-015, PHASE-016, PHASE-014` `Ref: api.md#backend-endpoints`

### Planning Phase Gameplay

- [ ] **[PHASE-018] Implement the planning-phase state machine and server clock** — Drive server-timestamped planning starts, countdowns, and transitions using the shared timing constants. `Depends: PHASE-010, PHASE-007` `Ref: flows.md#planning-phase-gameplay-flow`
- [ ] **[PHASE-019] Implement player movement and aim input processing** — Accept WASD and mouse aim input on the client, send it to the server, and update authoritative player state. `Depends: PHASE-018, PHASE-014` `Ref: state.md#sendplayerinput`
- [ ] **[PHASE-020] Render local player movement and private aim line** — Show the user’s own character, smooth interpolation, and a private aim line through the cursor during planning. `Depends: PHASE-019, PHASE-012` `Ref: flows.md#planning-phase-gameplay-flow`
- [ ] **[PHASE-021] Render invisible opponents as hidden during planning** — Ensure opponents are not visible except for the local player’s own entity and permitted private snapshots. `Depends: PHASE-020, PHASE-010` `Ref: main.md#implementation-critical-details`
- [ ] **[PHASE-022] Implement server-authoritative movement boundaries and overlap-free pass-through** — Keep movement authoritative, allow pass-through collisions, and prevent collision from exposing hidden opponents. `Depends: PHASE-019, PHASE-010` `Ref: schema.md#collection-playerstate`

### Sonar Detection

- [ ] **[PHASE-023] Implement sonar sweep geometry and detection sampling** — Add the rotating wedge sweep, configurable width/speed, and private detection generation on server ticks. `Depends: PHASE-018, PHASE-007` `Ref: flows.md#sonar-detection-snapshot-flow`
- [ ] **[PHASE-024] Deliver private sonar snapshot events to detecting players** — Send each detection only to the owning player with a fading silhouette position snapshot. `Depends: PHASE-023, PHASE-014` `Ref: schema.md#collection-sonardetectionsnapshot`
- [ ] **[PHASE-025] Render sonar wedges and fading silhouettes in the client** — Draw each player’s sweep and show non-tracking, fading opponent silhouettes for approximately the configured duration. `Depends: PHASE-024, PHASE-012` `Ref: design.md#semantic-tokens`
- [ ] **[PHASE-026] Add deterministic sonar timing tests** — Verify sonar rotation, wedge width, detection sampling, and snapshot fade timing with unit tests. `Depends: PHASE-023` `Ref: testing.md#critical-test-cases`

### Planning End and Locked-Aim Freeze

- [ ] **[PHASE-027] Implement planning-end freeze and deterministic overlap separation** — Freeze movement and aim at timer expiry, then separate any overlapping players deterministically. `Depends: PHASE-018, PHASE-022` `Ref: flows.md#planning-end-and-locked-aim-freeze-flow`
- [ ] **[PHASE-028] Lock firing lines and compute round order visibility** — Capture each player’s final aim, expose the upcoming order during planning, and freeze the locked firing lines for resolution. `Depends: PHASE-027, PHASE-007` `Ref: main.md#implementation-critical-details`
- [ ] **[PHASE-029] Implement first-round random order and per-round rotation** — Generate the first firing order randomly and rotate it by one position after every round for fairness. `Depends: PHASE-028` `Ref: schema.md#collection-shotresolutionrecord`
- [ ] **[PHASE-030] Render locked firing order and shooter labels** — Show the upcoming order during planning and the active shooter during resolution with clear HUD treatment. `Depends: PHASE-029, PHASE-012` `Ref: routes.md#route-tree`

### Sequential Shot Resolution

- [ ] **[PHASE-031] Implement deterministic ray intersection and non-piercing hit logic** — Resolve locked shots by infinite ray, hit only the first intersected player, and stop without piercing. `Depends: PHASE-028, PHASE-007` `Ref: schema.md#collection-shotresolutionrecord`
- [ ] **[PHASE-032] Implement heart damage and elimination rules** — Apply three-heart damage, cancel future shots for dead players, and transition eliminated players to spectator state. `Depends: PHASE-031, PHASE-010` `Ref: main.md#implementation-critical-details`
- [ ] **[PHASE-033] Implement sequential shot resolution with pause and reveal** — Reveal all surviving players and firing lines, then resolve shots one by one with a short pause between shooters. `Depends: PHASE-031, PHASE-029, PHASE-030` `Ref: flows.md#sequential-shot-resolution-flow`
- [ ] **[PHASE-034] Render muzzle flash, shot line, impact effect, and shot sound** — Add the instant per-shot visual and audio feedback used during resolution. `Depends: PHASE-033, PHASE-012` `Ref: components.md#component-index`
- [ ] **[PHASE-035] Add deterministic combat and phase-transition unit tests** — Verify ray hits, damage, elimination, cancelled shots, and resolution sequencing. `Depends: PHASE-031, PHASE-032` `Ref: testing.md#critical-test-cases`

### Match End and Replay

- [ ] **[PHASE-036] Implement win condition and match-end state** — Detect the last surviving player, stop the round loop, and enter the winner state. `Depends: PHASE-032, PHASE-033` `Ref: flows.md#match-end--winner--replay-to-lobby-flow`
- [ ] **[PHASE-037] Build results screen with replay-to-lobby flow** — Show the winner and provide a clean return path to the lobby without page reload. `Depends: PHASE-036, PHASE-016` `Ref: routes.md#route-tree`
- [ ] **[PHASE-038] Preserve live room state across replay and reconnect** — Keep active room state in memory for refresh/reconnect and return to lobby only when the match is actually gone. `Depends: PHASE-036, PHASE-009` `Ref: state.md#async-state`
- [ ] **[PHASE-039] Add spectator and late-join handling** — Send late joiners and eliminated players into a read-only spectator state until the next match. `Depends: PHASE-038, PHASE-010` `Ref: auth.md#roles--permissions`

## Phase 3 — Integration

- [ ] **[PHASE-040] Wire client/server reconnect support with session recovery** — Rejoin active rooms after refresh, restore session identity, and fall back to lobby when the server lost in-memory state. `Depends: PHASE-038, PHASE-014, PHASE-039` `Ref: flows.md#reconnect--refresh--wake-server-flow`
- [ ] **[PHASE-041] Add Render wake/retry connection handling** — Surface the connecting/waking multiplayer state and keep retrying until the server is reachable or the room can be rejoined. `Depends: PHASE-040, PHASE-015` `Ref: errors.md#retry-strategy`
- [ ] **[PHASE-042] Configure GitHub Pages base-path deployment for the client** — Ensure the Vite build works from the repository subpath and the deployed client reads the production server endpoint. `Depends: PHASE-006, PHASE-011` `Ref: env.md#github-pages-configuration`
- [ ] **[PHASE-043] Configure Render deployment for the authoritative server** — Build and run the server in Render Free, including secure WebSocket settings and production environment variables. `Depends: PHASE-006, PHASE-008` `Ref: env.md#colyseus/server-runtime-configuration`
- [ ] **[PHASE-044] Add multi-browser multiplayer integration checks** — Run Playwright flows across Chromium, Firefox, and Safari-like coverage against localhost and deployed environments. `Depends: PHASE-017, PHASE-033, PHASE-041` `Ref: testing.md#end-to-end`
- [ ] **[PHASE-045] Add room lifecycle and reconnection integration tests** — Verify create/join/start/reconnect/late-join behavior against the Colyseus room implementation. `Depends: PHASE-017, PHASE-040` `Ref: testing.md#integration`

## Phase 4 — Polish

- [ ] **[PHASE-046] Add loading, empty, and error-state treatment for every screen** — Cover host start failures, empty player lists, invalid room codes, and transient transport errors with clear messaging. `Depends: PHASE-041, PHASE-037` `Ref: errors.md#user-facing-messages`
- [ ] **[PHASE-047] Refine HUD hierarchy and match readability** — Tighten spacing, contrast, label copy, and phase emphasis so the lobby and match states are easy to read in motion. `Depends: PHASE-030, PHASE-034` `Ref: design.md#typography`
- [ ] **[PHASE-048] Add keyboard accessibility and focus management** — Ensure lobby forms, primary actions, and replay controls are keyboard operable with visible focus states. `Depends: PHASE-015, PHASE-037, PHASE-012` `Ref: design.md#ui-emphasis-tokens`
- [ ] **[PHASE-049] Implement client-side edge-case guards for stale or partial state** — Handle disconnects, stale snapshots, missing room state, and phase mismatches without crashing the UI. `Depends: PHASE-040, PHASE-046` `Ref: state.md#async-state`
- [ ] **[PHASE-050] Polish arena visual and audio feedback timing** — Tune silhouette fade, muzzle flash, impact, and resolution pauses to feel crisp and intentional. `Depends: PHASE-025, PHASE-034` `Ref: design.md#core-tokens`

## Phase 5 — Launch Readiness

- [ ] **[PHASE-051] Complete unit test coverage for shared rules and server services** — Finish deterministic tests for sonar geometry, order rotation, ray hits, damage, elimination, and phase transitions. `Depends: PHASE-026, PHASE-035, PHASE-045` `Ref: testing.md#unit`
- [ ] **[PHASE-052] Complete end-to-end validation on localhost and deployed targets** — Verify create/join/play/reconnect/winner flows on localhost, GitHub Pages, and the Render server. `Depends: PHASE-044, PHASE-042, PHASE-043` `Ref: testing.md#end-to-end`
- [ ] **[PHASE-053] Perform performance profiling and networking rate verification** — Confirm interpolation, update cadence, and render cost stay acceptable for 2–4 player matches. `Depends: PHASE-050, PHASE-051` `Ref: stack.md#frontend`
- [ ] **[PHASE-054] Run security and privacy review for hidden-information rules** — Verify no live invisible-opponent positions leak to unauthorized clients and session tokens are handled safely. `Depends: PHASE-040, PHASE-051` `Ref: auth.md#guest--anonymous-handling`
- [ ] **[PHASE-055] Validate observability and operational readiness** — Confirm health checks, logs, deploy status, and failure recovery are sufficient for friends-only internal playtests. `Depends: PHASE-043, PHASE-052, PHASE-054` `Ref: errors.md#logging`