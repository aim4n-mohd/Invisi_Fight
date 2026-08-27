# Invisi Fight v2 implementation progress

Started: 2026-08-26

Source of truth: `v2-build-plan-artifacts/main.md` and the required read order declared there. Existing v1 security, privacy, session, and authoritative-server protections remain binding.

## Current status

- Phase 0 - Baseline and planning lock: complete.
- Phase 1 - Shared rules and authoritative phase model: complete.
- Phase 2 - Manual sonar and reduced movement: complete.
- Phase 3 - Commit, resolution, and recap: complete.
- Phase 4 - HUD clarity and onboarding: complete.
- Phase 5 - Gameplay validation gate: ready for the external five-person playtest; human evidence remains unverified.
- Phase 6 - Three.js vertical slice: complete under explicit user direction using procedural temporary assets.
- Phase 7 - Asset pipeline and final renderer migration: gated by the remaining playtest and asset approvals.
- Phase 8 - Release readiness: not started.

## Task status

| Task     | State    | Evidence                                                                                               |
| -------- | -------- | ------------------------------------------------------------------------------------------------------ |
| `V2-001` | Complete | V1 branch, SHA, worktree, CI, E2E, bundle, and screenshots recorded below.                             |
| `V2-002` | Complete | This progress artifact tracks task state, verification, gates, and boundaries.                         |
| `V2-003` | Complete | `v2-build-plan-artifacts/migration-map.md` inventories the affected contracts and source files.        |
| `V2-004` | Complete | The red run produced 2 expected failures while 49 existing checks stayed green.                        |
| `V2-005` | Complete | Focused shared configuration suite passed: 1 file, 3 tests.                                            |
| `V2-006` | Complete | The 6-phase shared contract passes 2 tests and repository typecheck.                                   |
| `V2-007` | Complete | MatchClock passes 2 deterministic server-time tests.                                                   |
| `V2-008` | Complete | Clock/lifecycle suites pass 8 tests; monorepo typecheck passes.                                        |
| `V2-009` | Complete | Contract/snapshot suites pass 8 tests; monorepo typecheck passes.                                      |
| `V2-010` | Complete | Four red service cases captured the missing manual activation behavior.                                |
| `V2-011` | Complete | SonarService passes 4 tests; monorepo typecheck passes.                                                |
| `V2-012` | Complete | Authenticated room routing sends scanner-private detections and opponent-safe public emissions.        |
| `V2-013` | Complete | Integration coverage proves cooldown, invalid-token, opponent, and spectator privacy behavior.         |
| `V2-014` | Complete | Two integration cases prove Hunt movement and aim-only Commit input at the reduced shared speed.       |
| `V2-015` | Complete | Seven client tests plus server restoration coverage verify sonar prediction and reconciliation.        |
| `V2-016` | Complete | Twelve client checks prove Space input, pulse timing, persistence, routing, and state expiry.          |
| `V2-017` | Complete | Strict request/status contracts pass 8 shared boundary tests; the room test was captured red first.    |
| `V2-018` | Complete | Authoritative Commit locks support explicit replacement, stale rejection, restoration, and fallback.   |
| `V2-019` | Complete | Integration proof keeps exact aim/position hidden until Resolution and private statuses scoped.        |
| `V2-020` | Complete | Six checks cover HUD maximum, damage, reconnect visibility, elimination, and replay reset.             |
| `V2-021` | Complete | Integration timing proves 300 ms anticipation and at least 1.2 s between consecutive shots.            |
| `V2-022` | Complete | Two-round integration proves ordered recap state, health outcomes, preview parity, and clearing.       |
| `V2-023` | Complete | Eight client checks cover pending, accepted, replaced, automatic, rejected, validated, restored state. |
| `V2-024` | Complete | Eleven focused checks cover lock state plus shooter/outcome pacing and ordered DOM Recap rendering.    |
| `V2-025` | Complete | Countdown tests prove whole seconds, full 15 opening, 5-second warning, and 3-second urgency.          |
| `V2-026` | Complete | Action panel tests cover live sonar command/cooldown plus all Commit lock feedback states.             |
| `V2-027` | Complete | Seven tests cover contextual cue order, successful-action clearing, and boolean-only session flags.    |
| `V2-028` | Complete | Eleven focused checks cover spectator privacy/Recap and authorized reconnect restoration.              |
| `V2-029` | Complete | CI passed 84 checks; all 12 Chromium/Firefox/WebKit journeys passed; responsive captures are saved.    |
| `V2-030` | Pending  | Requires five new human players; automated checks cannot supply this evidence.                         |
| `V2-031` | Blocked  | Depends on the five-person clarity playtest.                                                           |
| `V2-032` | Blocked  | Depends on evidence-based tuning after the clarity playtest.                                           |
| `V2-033` | Blocked  | Depends on the fun/rematch playtest.                                                                   |
| `V2-034` | Blocked  | The gameplay contract cannot be called validated without the human gates.                              |
| `V2-035` | Complete | Three.js is the default lazy-loaded renderer; Phaser remains available as a fallback.                  |
| `V2-036` | Complete | Coordinate mapping, orthographic framing, resize, and pointer projection are test-backed.              |
| `V2-037` | Complete | A procedural tactical arena and small armed fighter render at production scale.                        |
| `V2-038` | Complete | Fighter visibility and active, hit, eliminated, and snapshot states preserve privacy.                  |
| `V2-039` | Complete | Three.js renders aim, sonar, snapshots, shots, impacts, and resolution emphasis.                       |
| `V2-040` | Complete | CI, cross-browser E2E, canvas checks, responsive captures, and local profiling passed.                 |

## V1 verification baseline

Captured before runtime changes on 2026-08-26.

- Branch: `main`
- Commit: `4977eb67e2d48677966b1347873ecb401a31062f`
- Existing worktree change at capture: only the untracked `v2-build-plan-artifacts/` planning package.
- Remote: `https://github.com/aim4n-mohd/Invisi_Fight.git`
- Client build output: 12 files, 12,508,688 bytes including source maps.
- Minified Phaser chunk: 1,482,340 bytes, 340.03 kB gzip, excluding its source map.

Validation:

```powershell
pnpm.cmd run ci
pnpm.cmd run test:e2e
```

Results:

- ESLint passed.
- Shared, server, and client TypeScript checks passed.
- Vitest passed: 21 files, 50 tests.
- Shared, server, and client builds passed.
- Playwright passed: 12 scenarios across Chromium, Firefox, and WebKit.
- The initial sandboxed invocations could not read Vite/Vitest configuration outside the managed boundary; rerunning the same commands with the required workspace permission passed. This was an execution-environment limitation, not a product failure.

Visual evidence:

- `v2-build-plan-artifacts/evidence/v1-baseline/lobby-1904x884.png`
- `v2-build-plan-artifacts/evidence/v1-baseline/match-1904x884.png`

The match baseline shows the v1 `planning` phase at 6.9 seconds, 3 hearts, the firing order, local fighter, private aim line, and automatic rotating sonar wedge.

## Gate state

| Gate               | State                      | Evidence or blocker                                                                |
| ------------------ | -------------------------- | ---------------------------------------------------------------------------------- |
| V1 baseline        | Passed                     | CI, 50 tests, 12 browser scenarios, build metrics, and screenshots recorded.       |
| Rules              | Passed                     | Central v2 values and authoritative phase/sonar contracts are test-backed.         |
| 2D clarity         | Awaiting observed playtest | Automated loop and visual checks passed; five-person evidence is still required.   |
| Fun/rematch        | Not started                | Requires clarity gate.                                                             |
| Cover decision     | Deferred                   | Evaluate only after fun gate.                                                      |
| Three.js slice     | Passed locally             | Explicitly authorized procedural slice passed tests, visual checks, and profiling. |
| Asset approval     | Blocked by remaining gates | No external or final art has been acquired.                                        |
| Renderer migration | In progress                | Three.js is default; Phaser remains an environment-selected fallback.              |
| Release            | Not started                | Local v2 production build passed; renderer migration and deployment remain.        |

## Progress rules

- Complete tasks in dependency order.
- Add the focused test first for gameplay behavior.
- Record exact commands and outcomes before marking a task complete.
- Treat playtest, browser, local build, physical-device, and live deployment evidence as distinct.
- Preserve unrelated user changes and never rewrite the v1 historical progress file.

## Phase 1 evidence

### `V2-004` - Red configuration contract

```powershell
pnpm.cmd test -- shared/tests/gameplayConfig.test.ts
```

The root script currently forwards an extra separator and therefore ran all projects. Result: 51 checks collected; the 2 new v2 configuration cases failed on missing `huntDurationMs` and `shotResolutionStepMs`, while 49 existing checks passed. This is the expected red state before `V2-005`.

### `V2-005` - Central v2 configuration

```powershell
& .\node_modules\.bin\vitest.cmd --run shared\tests\gameplayConfig.test.ts
```

Passed: 1 file, 3 tests. Temporary `planningDurationMs`, rotating-wedge, fade, and shot-pause aliases remain until their runtime consumers migrate.

### `V2-006` - Exhaustive phase contract

```powershell
& .\node_modules\.bin\vitest.cmd --run shared\tests\matchPhase.test.ts
pnpm.cmd run typecheck
```

Passed: 1 focused file, 2 tests, followed by shared/server/client TypeScript checks. Active runtime references now use `hunt`; only intentional legacy MatchClock/config aliases and tests still mention `planning`.

### `V2-007` and `V2-008` - Authoritative phase sequence

```powershell
& .\node_modules\.bin\vitest.cmd --run server\tests\matchClock.test.ts server\tests\roomLifecycle.integration.test.ts
pnpm.cmd run typecheck
```

Passed: 2 files, 8 tests, followed by shared/server/client TypeScript checks. The room now advances Hunt -> Commit -> Resolution -> Recap -> next Hunt on server time. Commit freezes velocity; Recap retains the public frozen resolution state until the next Hunt clears it.

## Phase 2 evidence

### `V2-009` - Manual-sonar network boundary

```powershell
& .\node_modules\.bin\vitest.cmd --run shared\tests\networkContracts.test.ts client\tests\privateSnapshotStore.test.ts
pnpm.cmd run typecheck
```

Passed: 2 files, 8 tests, followed by shared/server/client TypeScript checks. Public emissions are strict and reject undeclared exact origins or detected-player lists.

### `V2-010` and `V2-011` - Authoritative manual sonar

```powershell
& .\node_modules\.bin\vitest.cmd --run server\tests\sonarService.test.ts
pnpm.cmd run typecheck
```

Passed: 1 file, 4 tests, followed by shared/server/client TypeScript checks. The service owns cooldown readiness, radial sampling, frozen copies, quantization, reset, and disconnected-player cleanup. Automatic tick sampling is removed from the room.

### `V2-012` and `V2-013` - Sonar routing and privacy

```powershell
& .\node_modules\.bin\vitest.cmd --run server\tests\roomLifecycle.integration.test.ts -t "routes exact sonar" --reporter=dot
pnpm.cmd run typecheck
```

Passed: 1 focused integration case and the shared/server/client TypeScript checks. The server authenticates every pulse request, sends exact frozen detections only to the scanner, exposes only a 48 px-quantized origin to connected living opponents, excludes spectators, and produces no extra detection/emission on cooldown or invalid-token requests.

### `V2-014` - Movement speed and phase input gates

```powershell
& .\node_modules\.bin\vitest.cmd --run server\tests\roomLifecycle.integration.test.ts -t "accepts aim|applies a valid movement" --reporter=dot
pnpm.cmd run typecheck
```

Passed: 2 focused integration cases and the shared/server/client TypeScript checks. The room uses the shared 165 px/s speed during Hunt, accepts sequenced aim changes during Commit, and keeps Commit position and velocity frozen.

### `V2-015` - Client sonar command and state

```powershell
& .\node_modules\.bin\vitest.cmd --run client\tests\privateSnapshotStore.test.ts client\tests\matchViewStore.test.ts client\tests\sonarEventRouter.test.ts --reporter=dot
& .\node_modules\.bin\vitest.cmd --run server\tests\roomLifecycle.integration.test.ts -t "routes exact sonar" --reporter=dot
pnpm.cmd run typecheck
```

Passed: 3 client files with 7 tests, the focused server integration case, and all workspace TypeScript checks. The client predicts a pulse immediately, reconciles accepted timing, cancels typed rejection, rejects malformed events, expires public/private visuals on server time, blocks invalid local requests, and restores cooldown readiness from `session:ready`.

### `V2-016` - Phaser manual sonar presentation

```powershell
& .\node_modules\.bin\vitest.cmd --run client\tests\keyboardMovementController.test.ts client\tests\sonarRenderSystem.test.ts client\tests\privateSnapshotStore.test.ts client\tests\matchViewStore.test.ts client\tests\sonarEventRouter.test.ts --reporter=dot
pnpm.cmd run typecheck
```

Passed: 5 client files with 12 tests and all workspace TypeScript checks. Space queues one pulse per press; local and opponent rings expand on server-aligned timing; frozen detections no longer depend on a rotating wedge; public emissions and private snapshots expire independently; Commit input remains aim-only.

## Phase 3 evidence

### `V2-017` through `V2-019` - Private authoritative shot locking

```powershell
& .\node_modules\.bin\vitest.cmd --run shared\tests\networkContracts.test.ts server\tests\roomLifecycle.integration.test.ts -t "shot-lock|shot locks" --reporter=dot
pnpm.cmd run typecheck
```

Passed: 2 files with 3 selected tests (14 unrelated cases skipped) and all workspace TypeScript checks. Before implementation, the room test failed because `input:lock-shot` was intentionally unregistered. The completed flow rejects wrong-phase, malformed, spectator, and stale requests; supports explicit replacement; restores the caller's private accepted lock; applies automatic fallback; and publishes exact aim/position only when Resolution starts.

### `V2-020` - Two-heart matches and reset

```powershell
& .\node_modules\.bin\vitest.cmd --run client\tests\heartMeter.test.ts server\tests\combatResolver.test.ts server\tests\roomLifecycle.integration.test.ts -t "HeartMeter|CombatResolver|two-heart match" --reporter=dot
```

Passed: 3 files with 6 selected tests (9 unrelated cases skipped). The HUD reads its two-heart maximum from shared configuration, damage removes one of two hearts, reconnect state preserves health, the second successful hit ends the match, and replay restores both fighters to two.

### `V2-021` - Paced authoritative resolution

```powershell
& .\node_modules\.bin\vitest.cmd --run server\tests\roomLifecycle.integration.test.ts -t "paces shooter anticipation" --reporter=dot
```

Passed: 1 focused integration case (10 unrelated cases skipped). Resolution now publishes the active shooter before firing, waits the configured 300 ms anticipation, holds the outcome, and keeps consecutive discharges at least 1.2 seconds apart.

### `V2-022` - Reconnect-safe authoritative Recap

```powershell
pnpm.cmd run typecheck
& .\node_modules\.bin\vitest.cmd --run server\tests\roomLifecycle.integration.test.ts -t "two-heart match" --reporter=dot
```

Passed: all workspace TypeScript checks and 1 full two-round integration case (10 unrelated cases skipped). Recap entries are ordered public room state with hit/miss/cancelled outcome, target, resulting hearts, fatal flag, and server time. The previewed first shooter matches the next Hunt rotation; Recap clears on the next Hunt and replay.

### `V2-023` - Client explicit shot locking

```powershell
pnpm.cmd run typecheck
& .\node_modules\.bin\vitest.cmd --run client\tests\privateSnapshotStore.test.ts client\tests\sonarEventRouter.test.ts --reporter=dot
```

Passed: all workspace TypeScript checks and 2 client files with 8 tests. Primary click in Commit sends a private sequenced lock; client state distinguishes pending, accepted, replaced, automatic, and rejected feedback; strict schema routing drops malformed events; reconnect restores the accepted lock and sequence baseline.

### `V2-024` - Readable Phaser Resolution and DOM Recap

```powershell
pnpm.cmd run typecheck
& .\node_modules\.bin\vitest.cmd --run client\tests\recapPanel.test.ts client\tests\privateSnapshotStore.test.ts server\tests\roomLifecycle.integration.test.ts -t "RecapPanel|privateSnapshotStore|shot locks|two-heart match|paces shooter" --reporter=dot
```

Passed: all workspace TypeScript checks and 3 files with 11 selected tests (8 unrelated cases skipped). Commit keeps the local fighter and provisional aim visible, accepted locks use a distinct trajectory, Resolution highlights one shooter, shot effects hold for the result beat, eliminated positions remain visible, and Recap renders ordered outcomes plus the next starter.

## Phase 4 evidence

### `V2-025` and `V2-026` - Countdown and action hierarchy

```powershell
& .\node_modules\.bin\vitest.cmd --run client\tests\timerDisplay.test.ts client\tests\recapPanel.test.ts client\tests\heartMeter.test.ts --reporter=dot
& .\node_modules\.bin\vitest.cmd --run client\tests\actionPanel.test.ts client\tests\timerDisplay.test.ts client\tests\recapPanel.test.ts --reporter=dot
pnpm.cmd run typecheck
```

Passed: the countdown/HUD runs produced 4 then 5 tests, followed by all workspace TypeScript checks. Hunt opens at a stable whole-number 15, changes warning treatment at 5, adds an urgent 3-2-1 beat with reduced-motion fallback, and keeps a fixed HUD slot. The action panel shows live sonar readiness/cooldown, a usable Scan command, Commit lock lifecycle, and the active Resolution shooter without resizing the arena.

### `V2-027` - Contextual first-session cues

```powershell
& .\node_modules\.bin\vitest.cmd --run client\tests\onboardingStore.test.ts client\tests\actionPanel.test.ts client\tests\keyboardMovementController.test.ts --reporter=dot
pnpm.cmd run typecheck
```

Passed: 3 client files with 7 tests and all workspace TypeScript checks. Visual emphasis advances Move -> Scan during Hunt and Aim -> Lock during Commit, clears only after successful input, stores only boolean completion flags in `sessionStorage`, respects reduced motion, and never pauses server phase time.

### `V2-028` - Spectator and reconnect parity

```powershell
& .\node_modules\.bin\vitest.cmd --run client\tests\privateSnapshotStore.test.ts client\tests\recapPanel.test.ts server\tests\roomLifecycle.integration.test.ts -t "privateSnapshotStore|RecapPanel|creates, joins|routes exact sonar|shot locks" --reporter=dot
```

Passed: 3 files with 11 selected tests (8 unrelated cases skipped). The spectator view renders all v2 public phases and Recap without action controls; late spectators receive no private detections or lock acknowledgements. Transport reconnect preserves identity/health, and refreshed `session:ready` restores only the authorized fighter's sonar readiness and accepted lock.

## Phase 5 entry evidence

### `V2-029` - Complete v2 Phaser multiplayer E2E coverage

```powershell
pnpm.cmd run ci
pnpm.cmd run test:e2e
```

Results:

- ESLint and all shared/server/client TypeScript checks passed.
- Vitest passed: 29 files, 84 tests.
- Shared, server, and client production builds passed. The minified Phaser chunk is 1,482.34 kB and 340.03 kB gzip, excluding its source map.
- Playwright passed: 12 scenarios across Chromium, Firefox, and WebKit. The full multiplayer journey covers visible Hunt timing, movement, sonar activation/cooldown/reuse, scanner-private detection, opponent-safe public emission, explicit and automatic locks, paced resolution, Recap, spectator privacy, two-heart results, and replay. Separate cases cover refresh reconnect, keyboard focus, and narrow-layout overflow.
- The shared protocol is now version 2; the server config endpoint and client compatibility check use the same centralized value.

Visual evidence captured from the running local build:

- `v2-build-plan-artifacts/evidence/v2-phaser/match-desktop-1904x884.png`
- `v2-build-plan-artifacts/evidence/v2-phaser/match-mobile-390x844.png`

At 1904 x 884 the HUD and complete arena fit in one viewport. At 390 x 844 the HUD stacks above the complete arena with zero horizontal overflow and no measured overlap between the phase, countdown, action, health, firing-order, or arena regions. These are local browser checks, not live-deployment or physical-device evidence.

`V2-030` remains external: five new players must attempt the loop without a pre-round rules explanation. The user explicitly authorized the procedural Three.js slice before that evidence; final asset acquisition and full renderer cutover remain blocked until the remaining gates pass.

## Phase 6 evidence

### `V2-035` through `V2-040` - Procedural Three.js 2.5D round slice

The arena now lazy-loads Three.js by default and retains Phaser behind `VITE_ARENA_RENDERER=phaser`. The authoritative server, DOM HUD, flat 2D simulation, input/network contracts, and hidden-information rules are unchanged.

The procedural slice includes:

- A fixed orthographic tactical camera mapping simulation X/Y to Three.js X/Z.
- A compact low-poly fighter with a separate two-handed gun assembly that follows ground-projected mouse aim continuously.
- A lit industrial floor, boundary rails, and posts without adding visual objects that imply nonexistent collision.
- Local/private Hunt and Commit visibility, public Resolution reveals, private sonar snapshots, public approximate emissions, aim/lock lines, shooter anticipation, tracers, impacts, hit feedback, and elimination states.
- Resize and WebGL lifecycle cleanup plus renderer diagnostics for context state, draw calls, nonblank pixels, frame timing, and gun angle.

Focused TDD started with missing-module failures, then passed 6 tests across coordinate conversion, ground aiming, fighter construction, and phase/privacy visibility. Final validation:

```powershell
pnpm.cmd run ci
pnpm.cmd run test:e2e
```

Results:

- Vitest passed: 33 files, 90 tests.
- Production builds passed. The Three.js runtime chunk is 520.24 kB and 130.43 kB gzip; the Three game module is 21.29 kB and 7.30 kB gzip.
- Playwright passed all 12 Chromium, Firefox, and WebKit scenarios. The full journey asserts a ready orthographic renderer, nonblank pixels, gun rotation from pointer input, movement, two accepted sonar pulses separated by cooldown, private/public sonar boundaries, explicit and automatic locks, paced resolution, actual Recap rendering, Results, replay, and spectator behavior.
- Local desktop profiling over 424 rendered frames measured 16.76 ms average frame time and 33.20 ms maximum observed frame time, with 46 Hunt draw calls.
- Desktop and 390 x 844 mobile checks showed a nonblank, fully framed canvas without measured overflow or UI overlap.

Visual evidence:

- `v2-build-plan-artifacts/evidence/v2-three-slice/hunt-desktop-1904x884.png`
- `v2-build-plan-artifacts/evidence/v2-three-slice/sonar-desktop-1904x884.png`
- `v2-build-plan-artifacts/evidence/v2-three-slice/resolution-desktop-1904x884.png`
- `v2-build-plan-artifacts/evidence/v2-three-slice/match-mobile-390x844.png`

This is local browser evidence. It is not a five-person playtest, final-asset/license approval, physical-device proof, live deployment, or authorization to remove Phaser.

## Post-slice gameplay, audio, and UI polish

Completed under explicit user direction on 2026-08-27.

- Added `shotHitRadiusPx: 22` for authoritative ray hits while preserving the 16 px movement/collision body. A 21 px visual near-miss is now a hit, and first-hit/non-piercing behavior remains unchanged.
- Increased `sonarPulseRadiusPx` from 320 to 1,100. A server test places fighters at opposite playable corners and proves the detector receives the far snapshot without changing private/public routing.
- Generated `client/src/assets/audio/sonar-ping.wav` in ChipTone and validated it as 351.497 ms, mono, 44,100 Hz, 16-bit PCM with a 0.231 peak ratio. Playback occurs once per local pulse request sequence in both Three.js and Phaser paths.
- Replaced the three-panel landing page with one centered console containing the brand, one explanation line, fighter-name entry, and create/join controls.
- Refined the dark tactical palette, background grid, controls, responsive landing layout, compact match header, phase/countdown/action hierarchy, health, firing order, focus states, and panel treatment.
- Kept the actual Recap component observable across match-screen remounts and allows it to appear as soon as the final Resolution entry arrives. The authoritative 1.5-second Recap timing is unchanged.

TDD captured the old behavior first: the new configuration, far-corner sonar, 21 px shot, compact landing, and missing audio module produced four assertion failures plus one missing-module suite while 10 existing focused checks passed. The completed focused run passed 5 files and 15 tests.

Final validation:

```powershell
pnpm.cmd run format:check
pnpm.cmd run ci
pnpm.cmd run test:e2e
```

Results:

- Formatting, ESLint, shared/server/client typechecks, and all production builds passed.
- Vitest passed: 35 files, 95 tests.
- Playwright passed all 12 Chromium, Firefox, and WebKit scenarios. This includes two accepted sonar pulses separated by cooldown, scanner-private/opponent-public state, complete round/Recap/Results/replay, keyboard focus, reconnect, and narrow-layout overflow.
- ChipTone WAV validation passed within 1.497 ms of the intended 350 ms duration.
- Desktop 1,440 x 900 and mobile 390 x 844 landing checks had no horizontal overflow. The desktop match HUD and complete Three.js arena fit within one 1,440 x 900 viewport without overlap.

Visual evidence:

- `v2-build-plan-artifacts/evidence/v2-polish/landing-desktop-1440x900.png`
- `v2-build-plan-artifacts/evidence/v2-polish/landing-mobile-390x844.png`
- `v2-build-plan-artifacts/evidence/v2-polish/match-desktop-1440x900.png`

This remains local automated/browser evidence, not the external five-person playtest, live deployment, physical-device proof, final art approval, or authorization to remove Phaser.
