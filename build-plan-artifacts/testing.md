## Strategy

Use a **test-first TDD approach for deterministic gameplay logic and shared contracts**, then **test-after for UI wiring and multiplayer transport glue** where Colyseus/Phaser integration makes strict TDD less efficient. Rationale: Invisi Fight’s core risk is not visual polish; it is correctness of hidden-information rules, authoritative sequencing, private snapshot delivery, and reconnect behavior. Testing should therefore prioritize deterministic pure logic in `shared/` and server room services, then validate room synchronization, privacy boundaries, and multi-browser gameplay with integration and end-to-end tests. Coverage targets by layer: **unit 80%**, **integration 15%**, **end-to-end 5%** of the suite, with the understanding that end-to-end tests are expensive and reserved for the critical multiplayer paths.

## Files To Create/Edit

| Path | Why this file is needed |
|---|---|
| `testing.md` | Canonical test strategy and acceptance specification for the Invisi Fight MVP build plan. |
| `shared/src/config/gameplayConfig.ts` | Central gameplay constants must be covered by unit tests for timing, sonar, fade, shot pause, hearts, and update cadence. |
| `shared/src/types/match.ts` | Shared contracts need unit tests or type-level checks to prevent client/server drift in state and private message shapes. |
| `shared/src/types/network.ts` | Network envelope contracts require validation tests to ensure room auth, reconnect, and private message payloads stay compatible. |
| `server/src/rooms/MatchRoom.ts` | Authoritative room logic needs integration tests for phase transitions, sequential shot resolution, reconnection, and privacy enforcement. |
| `server/src/rooms/MatchRoomState.ts` | Room state structure needs tests around public vs private fields and reconnection-safe state persistence. |
| `server/src/services/SessionService.ts` | Session token issuance/verification should be tested for anonymous room-based identity and reconnect flow. |
| `server/src/services/RoomAuthService.ts` | Join/start/host authorization rules require tests to protect room lifecycle and host-only control. |
| `server/src/services/MatchRulesService.ts` | Any pure rules module for firing order, overlap separation, and elimination logic should be unit tested thoroughly. |
| `server/src/services/GeometryService.ts` | Sonar wedge math, ray intersection, and visibility calculations need deterministic unit tests. |
| `server/src/index.ts` | Server bootstrap and health endpoints need smoke/integration checks for environment and transport configuration. |
| `client/src/network/colyseusClient.ts` | Client networking adapter needs tests for join/create/reconnect, private message handling, and retry behavior. |
| `client/src/state/sessionStore.ts` | Session persistence logic needs tests for room code, endpoint, and reconnect token handling. |
| `client/src/state/connectionStore.ts` | Connection lifecycle and “waking multiplayer server” state need tests because they are user-visible. |
| `client/src/state/privateSnapshotStore.ts` | Private sonar detections and aim preview storage must be verified to avoid leaking hidden positions. |
| `client/src/screens/ConnectingScreen.tsx` | Sleep/wake/retry UI must be tested for readable status feedback and retry loops. |
| `client/src/screens/LandingScreen.tsx` | Lobby entry flow needs tests for name entry, create/join actions, and connection status. |
| `client/src/screens/RoomLobbyScreen.tsx` | Lobby room-code, player list, and host-start control need tests for role visibility and state transitions. |
| `client/src/screens/MatchScreen.tsx` | Match HUD, planning labels, sonar, firing order, and resolution indicators need component/integration tests. |
| `client/src/screens/ResultsScreen.tsx` | Winner and replay-to-lobby flow need tests for match completion and reset behavior. |
| `client/src/components/hud/*` | HUD widgets need focused rendering tests for timer, hearts, firing order, and phase labels. |
| `client/src/scenes/*` | Phaser scene boot, world render, interpolation, and visual effects need integration tests where practical. |
| `client/vitest.config.ts` | Client test configuration is needed to run TypeScript unit/integration tests in the browser-like environment. |
| `server/vitest.config.ts` | Server test configuration is needed for Node-side unit/integration tests. |
| `playwright.config.ts` | E2E configuration is needed for multi-browser multiplayer checks against local and deployed endpoints. |
| `.github/workflows/ci.yml` | CI pipeline definition is needed to run the blocking test layers and publish test artifacts. |
| `package.json` | Root scripts are needed to standardize unit, integration, and Playwright execution across the monorepo. |

## Test Layers

### Unit

-

**What it tests:** Pure deterministic logic in `shared/` and server/client service modules: sonar sweep geometry, silhouette fade timing calculations, ray-hit resolution, non-piercing hit rules, firing-order rotation, overlap separation determinism, damage/elimination rules, phase transition rules, session token encoding/decoding, and store reducers/selectors.
-

**What it deliberately does not test:** Phaser rendering, DOM layout, Colyseus transport, WebSocket connectivity, browser compatibility, real timers, or server hosting behavior.
-

**Target ratio:** **80%** of the total test suite.
-

**Tooling used:** Vitest, TypeScript, and lightweight spies/mocks from the chosen mock library.

### Integration

-

**What it tests:** Colyseus room lifecycle, authoritative match state updates, public/private message routing, reconnect acceptance, host start authorization, server health endpoints, client networking adapter behavior, and screen/store wiring that crosses module boundaries.
-

**What it deliberately does not test:** Full browser rendering fidelity, cross-browser quirks, or every individual geometry calculation already covered at unit level.
-

**Target ratio:** **15%** of the total test suite.
-

**Tooling used:** Vitest with Node environment for server integration, jsdom for client component integration where needed, and Colyseus test harness/helpers.

### End-to-End

-

**What it tests:** Full user journeys in real browsers: create room, join room code, wait for player quorum, host start, planning movement and aiming, sonar detection visibility, round resolution, death/spectator behavior, winner display, replay to lobby, reconnect after refresh, and sleep/wake retry on the deployed server.
-

**What it deliberately does not test:** Internal implementation details, exact function calls, or fine-grained server state fields that are better asserted in unit/integration tests.
-

**Target ratio:** **5%** of the total test suite.
-

**Tooling used:** Playwright with Chromium, Firefox, and WebKit.

## Naming Conventions

-

**File naming pattern:** `*.test.ts` for unit/integration logic, `*.spec.ts` for higher-level integration of room flows or UI components, and `*.e2e.ts` for Playwright end-to-end cases.
- **describe/it convention:** Use `describe('<module or feature>')` and `it('should <behavior> when <condition>')`. Keep the subject as a concrete game rule or UI state, not a generic test label.
-

**Assertion style:** Prefer explicit, behavior-focused assertions with `expect(...).toEqual(...)`, `toBe(...)`, `toHaveLength(...)`, and `toContain(...)`. Use snapshot testing only for stable HUD text fragments, never for gameplay state that should be asserted structurally.
- **Well-named examples from this product’s domain:**
  1. `it('should reveal a fading silhouette only to the detecting player when the sonar wedge crosses an opponent')`
  2. `it('should cancel a locked shot when the shooter loses their final heart before firing turn')`
  3. `it('should rotate the firing order by one seat after each round when the match advances to the next planning phase')`

## Mocking Rules

-

**Must always be mocked:** 
  - External network calls outside the Colyseus room boundary, including any render-server wake/status probing that would otherwise hit the internet.
  - Time, including `Date.now()`, timers, and server timestamps when verifying phase transitions or fade windows.
  - Randomness, including first-round firing order selection and any random tie-break or deterministic shuffle input.
  - Browser APIs that are flaky in tests, such as `ResizeObserver`, `matchMedia`, and audio playback.
-

**Must never be mocked:** 
  - Core business logic for sonar, ray intersection, hit resolution, elimination, phase transitions, firing order, and reconnection eligibility.
  - The module under test itself, including the authoritative room or service being exercised.
  - Shared contracts and config modules; these should be imported directly and asserted as real artifacts.
- **Mock library/strategy in use:** Vitest spies/mocks for unit and integration tests; Playwright route interception only for E2E network stubbing where a real backend is not the purpose of the scenario. Use dependency injection for time and random sources rather than global monkey-patching where practical.

## Critical Test Cases

### Lobby, identity, and connection

- it should create a room and persist the server-issued session token when the player submits a display name and presses create room
- it should join an existing room when the player enters a valid room code and presses join
- it should show the connecting/waking multiplayer server state when the Render server is sleeping or unavailable
- it should retry connection until the room becomes available when the server returns after a wake delay
- it should reject starting a room when fewer than two players are present
- it should allow only the host to start the match when the lobby is ready

### Match planning and hidden movement

- it should keep opponents invisible during planning when the local player has not detected them with sonar
- it should render the local player’s own character and private aim line when planning is active
- it should allow movement and aim updates during the 10-second planning phase when the player is alive
- it should stop accepting movement and aiming input when planning time expires
- it should place spectators into watch-only state when they join during an active match

### Sonar detection and silhouette privacy

- it should reveal a fading silhouette only to the detecting player when the sonar wedge crosses an opponent
- it should fade the silhouette over approximately 1.25 seconds when no new detection occurs
- it should keep a detection snapshot fixed at the detected position when the opponent later moves away
- it should not leak the opponent’s live position to non-detecting clients during planning
- it should use centrally configured sonar speed, wedge width, and fade duration values when computing detection timing

### Resolution, ray hits, and elimination

- it should lock each player’s firing line at the end of planning when the phase transitions to resolution
- it should resolve shots sequentially in the displayed firing order when the round expires
- it should damage only the first intersected player when a locked shot travels through the arena
- it should not pierce through the first hit target when multiple players are aligned on the same ray
- it should cancel a locked shot when the shooter loses their final heart before their firing turn
- it should remove eliminated players from the arena and move them to spectator state
- it should separate overlapping players deterministically when the planning timer expires
- it should declare the last surviving player as winner when only one player remains alive

### Firing order fairness

- it should choose the first round firing order randomly when the match begins
- it should rotate the firing order by one seat after every round when the next planning phase starts
- it should display the upcoming order during planning and the active shooter during resolution
- it should preserve the round order across reconnects when the server remains authoritative and the match is still live

### Reconnection and session continuity

- it should restore the player to the active room state when reconnecting with a valid session token during the grace period
- it should return the player to the lobby state when the server restart has destroyed the in-memory match and no live room exists
- it should keep public room state synchronized after a browser refresh when reconnect is supported
- it should resubscribe private messages after reconnect so the player continues to receive sonar snapshots and private aim updates

### Multiplayer correctness across browsers

- it should keep public match phase and timer synchronized across Chromium, Firefox, and WebKit clients during the same round
- it should preserve hidden movement privacy so one client cannot see another client’s live planning position unless revealed by resolution
- it should show consistent winner and replay-to-lobby behavior across desktop browsers after the final elimination

## CI Checks

-

**Blocking in CI:** 
  - Unit tests for `shared/`, `server/`, and client pure logic.
  - Integration tests for Colyseus room flow, session/reconnect, and client networking adapters.
  - TypeScript typecheck for client, server, and shared packages.
  - Playwright smoke E2E on Chromium against local preview.
- **Non-blocking in CI:**  
  - Full cross-browser Playwright suite on Chromium, Firefox, and WebKit.
  - Deployed-endpoint Playwright smoke against GitHub Pages and Render when credentials/environment are available.
-

**Required pass threshold:** 100% of blocking checks must pass; non-blocking checks are informational but must not regress known critical flows.
-

**Estimated runtime target:** 10–15 minutes for blocking CI, under 25 minutes for the full pipeline including cross-browser and deployed smoke tests.

## Manual QA Checklist

### Lobby, hosting, and wake/retry

- Verify the landing lobby shows a readable connection status, accepts a display name, and allows create/join actions immediately.
- Verify the host can create a room, share the code, and start only after at least two players are present.
- Verify the client clearly shows “Connecting/Waking multiplayer server” when the Render server has slept and recovers without a full page reload.
- Verify a browser refresh during an active room restores the player to the same room when the server is still running.

### Hidden movement and sonar perception

- Verify each player always sees their own character while opponents remain invisible during planning unless detected by sonar.
- Verify the sonar wedge rotates smoothly, is narrow enough to feel like a real scan, and silhouettes appear only for the detecting player.
- Verify detected silhouettes fade out at an acceptable pace and do not visibly track later opponent movement.
- Verify movement through other players never produces collision-based information leaks in the small open arena.

### Match resolution and fairness

- Verify the planning timer ends cleanly, movement and aiming freeze, and overlapping players are separated in a way that feels deterministic rather than jarring.
- Verify the firing order is visible during planning, the active shooter is obvious during resolution, and each shot feels instant with muzzle flash, line, impact, and sound.
- Verify a player eliminated before their turn has their shot cancelled and the UI reflects the elimination immediately.
- Verify the round order rotates fairly between matches so the same player is not repeatedly advantaged.

### Results and replay

- Verify the winner screen is unambiguous, the lobby can be re-entered without refresh, and a rematch can begin cleanly.
- Verify a full 2–4 player match can complete from lobby to winner state and back to lobby on the target browsers without visible state desync.
- Verify spectator-only state during active matches is understandable and does not allow input that changes the game.

### Deployment and hosting

- Verify the client loads correctly from the GitHub Pages repository subpath in production mode.
- Verify the client connects to the secure `wss://` Render endpoint in production and not the localhost endpoint.
- Verify the app behaves acceptably on current desktop Chromium, Firefox, and Safari releases on Windows 11, macOS 14, and Ubuntu 22.04 browsers.
- Verify audio, muzzle flash, and impact effects are present and not blocked by production asset paths or browser autoplay restrictions after the first user gesture.