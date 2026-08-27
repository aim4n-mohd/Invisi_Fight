# V2 dependency-ordered task list

Status key: `[ ]` not started, `[~]` in progress, `[x]` complete, `[!]` blocked.

No implementation task is started by creating this plan.

## Phase 0 - Baseline and planning lock

- [x] **[V2-001] Record a clean v1 verification baseline** - Capture branch/SHA, worktree state, `pnpm.cmd run ci`, local multiplayer E2E, bundle size, and current screenshots before changes. `Depends: none` `Ref: context.md`
- [x] **[V2-002] Create v2 progress tracking** - Add a root progress file that records task status, tests, playtest evidence, screenshots, asset decisions, and remaining gates without rewriting this plan. `Depends: V2-001` `Ref: state.md`
- [x] **[V2-003] Confirm v2 config names and contract migration map** - Enumerate every `planning` phase switch, sonar constant, UI selector, test, and message affected by Hunt/Commit/Recap before editing. `Depends: V2-001` `Ref: architecture.md#contract-changes`

## Phase 1 - Shared rules and authoritative phase model

- [x] **[V2-004] Add failing shared tests for v2 defaults** - Cover 15-second Hunt, 3-second Commit/cooldown, 165 px/s speed, 2 hearts, resolution pacing, recap, sonar radius, snapshot duration, and quantization. `Depends: V2-003` `Ref: gameplay.md#proposed-central-configuration`
- [x] **[V2-005] Replace legacy gameplay constants with v2 centralized values** - Update shared config while retaining temporary legacy aliases only where required for staged compilation. `Depends: V2-004` `Ref: gameplay.md#proposed-central-configuration`
- [x] **[V2-006] Extend match phases and exhaustive type coverage** - Add Hunt, Commit, Resolution, Recap, Lobby, and Results types and update compile-time/exhaustive tests. `Depends: V2-004` `Ref: architecture.md#match-phases`
- [x] **[V2-007] Add deterministic MatchClock phase-window tests** - Verify exact boundaries and no client-driven extension across Hunt, Commit, and Recap. `Depends: V2-005, V2-006` `Ref: gameplay.md#round-state-machine`
- [x] **[V2-008] Implement the authoritative Hunt/Commit/Resolve/Recap state machine** - Update room transitions, reconnect state, replay reset, and result routing without renderer changes. `Depends: V2-007` `Ref: gameplay.md`

## Phase 2 - Manual sonar and reduced movement

- [x] **[V2-009] Specify and validate sonar network contracts** - Add `trigger_sonar`, private sonar status/snapshots, and public quantized emission schemas with malformed-payload tests. `Depends: V2-005, V2-006` `Ref: architecture.md#contract-changes`
- [x] **[V2-010] Add failing SonarService tests** - Cover phase/alive/spectator authorization, 3-second cooldown edges, 320-pixel radial detection, snapshot freezing/expiry, and 48-pixel origin quantization. `Depends: V2-009` `Ref: testing.md#unit-coverage`
- [x] **[V2-011] Implement server-authoritative sonar cooldown and sampling** - Replace automatic wedge sampling with accepted manual pulses and per-player readiness. `Depends: V2-010` `Ref: gameplay.md#manual-sonar-request`
- [x] **[V2-012] Route private detections and public risk emissions** - Send exact frozen detections only to the scanner and quantized pulse origins to allowed public recipients. `Depends: V2-011` `Ref: architecture.md#public-server-to-client-eventsstate`
- [x] **[V2-013] Add sonar privacy integration tests** - Prove detectors, opponents, and spectators receive only their permitted event fields. `Depends: V2-012` `Ref: testing.md#privacysecurity-checks`
- [x] **[V2-014] Apply reduced movement speed and phase input gates** - Move at 165 px/s during Hunt, accept aim during Hunt/Commit, and reject movement outside Hunt. `Depends: V2-005, V2-008` `Ref: gameplay.md#hunt`
- [x] **[V2-015] Add client sonar state and command handling** - Track readiness, prediction/reconciliation, valid snapshots, public emissions, reconnect restoration, and typed rejection. `Depends: V2-009, V2-012` `Ref: gameplay.md#cooldown-feedback`
- [x] **[V2-016] Render manual pulse, cooldown, and persistent frozen snapshots in Phaser** - Remove live-wedge gating so snapshots remain for their configured lifetime. `Depends: V2-015` `Ref: gameplay.md#manual-sonar-request`

## Phase 3 - Commit, shot lock, readable resolution, and recap

- [x] **[V2-017] Add shot-lock contracts and server tests** - Cover explicit lock, replacement sequence, invalid phase/angle, privacy, reconnect, and automatic deadline fallback. `Depends: V2-006, V2-008` `Ref: gameplay.md#locking-a-shot`
- [x] **[V2-018] Implement authoritative Commit locking** - Freeze movement, accept provisional aim and lock requests, acknowledge privately, and select explicit/automatic final aim at expiry. `Depends: V2-017` `Ref: gameplay.md#commit`
- [x] **[V2-019] Preserve resolution privacy boundaries** - Prove locked aim and exact positions remain private until Resolve and become public only at the intended transition. `Depends: V2-018` `Ref: architecture.md#contract-changes`
- [x] **[V2-020] Change health and reset behavior to two hearts** - Update initialization, replay, reconnect, elimination, UI assumptions, and deterministic tests. `Depends: V2-005, V2-008` `Ref: gameplay.md#results-and-replay`
- [x] **[V2-021] Implement paced shooter resolution** - Add anticipation, shot, result-hold scheduling around the existing authoritative ray resolver without making the client decide outcomes. `Depends: V2-018, V2-020` `Ref: gameplay.md#resolve`
- [x] **[V2-022] Add authoritative recap entries and phase** - Build ordered shot summaries, next-shooter preview, phase timing, replay clearing, and reconnect behavior. `Depends: V2-021` `Ref: gameplay.md#recap`
- [x] **[V2-023] Add client lock state and explicit click input** - Distinguish provisional, pending, accepted, replaced, automatic, and rejected lock states. `Depends: V2-018` `Ref: gameplay.md#locking-a-shot`
- [x] **[V2-024] Render readable Phaser resolution and recap** - Highlight one active shooter, slow each outcome, animate hit/miss/health, and show compact recap before the next Hunt. `Depends: V2-021, V2-022, V2-023` `Ref: gameplay.md#resolve`

## Phase 4 - HUD clarity and onboarding

- [x] **[V2-025] Build the persistent 15-second countdown** - Use server-aligned whole seconds, warning states at 5 and 3-2-1, reduced-motion behavior, and layout tests. `Depends: V2-008` `Ref: gameplay.md#countdown`
- [x] **[V2-026] Redesign the phase and action hierarchy** - Make Hunt, sonar ready/cooldown, Commit, locked state, active shooter, health, firing order, and Recap scannable without overlapping the arena. `Depends: V2-015, V2-023, V2-025` `Ref: main.md#product-objective`
- [x] **[V2-027] Add first-session contextual onboarding** - Cue Move, Scan, Aim, and Lock in context; persist only completion flags and never block phase timing. `Depends: V2-016, V2-023, V2-026` `Ref: gameplay.md#onboarding`
- [x] **[V2-028] Update spectator and reconnect UI for every v2 phase** - Preserve read-only public viewing and restore authorized personal feedback after reconnect. `Depends: V2-015, V2-022, V2-026` `Ref: gameplay.md#spectators-and-reconnect`
- [x] **[V2-029] Complete v2 Phaser multiplayer E2E coverage** - Validate countdown, lower speed, sonar cooldown/reuse, explicit/automatic lock, paced resolution, two-heart result, reconnect, spectator, and replay. `Depends: V2-016, V2-024, V2-028` `Ref: testing.md#end-to-end-coverage`

## Phase 5 - Gameplay validation gate

- [ ] **[V2-030] Run five-person clarity playtest** - Use new players, no pre-round rules explanation, the exact questions and 4-of-5 threshold from the test plan, and recorded observations. `Depends: V2-029` `Ref: testing.md#moderated-clarity-playtest`
- [ ] **[V2-031] Tune only centrally configured balance values** - Adjust speed, pulse radius, snapshot duration, Commit length, resolution pacing, or health only when playtest evidence identifies a specific issue; rerun affected tests. `Depends: V2-030` `Ref: context.md#open-tuning-questions`
- [ ] **[V2-032] Run the fun/rematch playtest gate** - Record decision quality, scan risk, movement purpose, timing, match length, and voluntary rematches. `Depends: V2-031` `Ref: testing.md#fun-playtest`
- [ ] **[V2-033] Decide whether cover deserves a separate scope** - Open a new design addendum only if understanding passes but movement remains strategically empty; otherwise record cover as rejected/deferred. `Depends: V2-032` `Ref: gameplay.md#post-playtest-cover-decision`
- [ ] **[V2-034] Freeze the validated gameplay contract** - Update v2 plan/progress with final tuned values and evidence before any Three.js migration task begins. `Depends: V2-032, V2-033` `Ref: main.md#delivery-gates`

## Phase 6 - Three.js vertical slice

The user explicitly authorized this procedural slice before the external playtest. This is a narrow exception to the original dependency order; it does not validate `V2-030` through `V2-034` or authorize final assets and Phaser removal.

- [x] **[V2-035] Add Three.js behind a renderer switch** - Three.js is the lazy-loaded default under the explicit graphics request; Phaser remains available through `VITE_ARENA_RENDERER=phaser`, without duplicate canvases, input handlers, or network subscriptions. `Exception: explicit user direction` `Ref: architecture.md#stage-b-threejs-vertical-slice`
- [x] **[V2-036] Implement coordinate mapping, orthographic camera, and resize framing** - Map 2D X/Y to Three.js X/Z, frame the full arena, cap pixel ratio, and test pointer projection. `Depends: V2-035` `Ref: architecture.md#architectural-principle`
- [x] **[V2-037] Create the temporary tactical-diorama scene** - Add floor, boundary dressing, lighting, procedural fighter, and fixed production-scale camera. `Depends: V2-036` `Ref: visual-assets.md#vertical-slice-asset-list`
- [x] **[V2-038] Implement fighter visibility and animation states** - Render local, hidden, snapshot hologram, frozen reveal, active shooter, hit, and eliminated states without privacy leakage. `Depends: V2-037` `Ref: architecture.md#stage-c-parity-migration`
- [x] **[V2-039] Implement Three.js sonar, aim, shot, and recap visuals** - Cover local pulse, public approximate emission, frozen snapshot, provisional/locked line, anticipation, tracer, hit/miss, and recap emphasis. `Depends: V2-038` `Ref: visual-assets.md#art-readability-rules`
- [x] **[V2-040] Validate the complete Three.js round slice** - Run screenshot/canvas checks, full-size readability review, privacy assertions, performance measurement, resize, and resource disposal. `Depends: V2-039` `Ref: testing.md#threejs-visual-verification`

## Phase 7 - Asset pipeline and full renderer migration

- [ ] **[V2-041] Freeze camera, fighter scale, animation, and asset budgets** - Record the approved slice specifications before searching, purchasing, or commissioning final art. `Depends: V2-040` `Ref: visual-assets.md#approval-checklist`
- [ ] **[V2-042] Create and enforce the asset register** - Record exact source, creator, license, acquisition, modification, export, and attribution data for every external asset. `Depends: V2-041` `Ref: visual-assets.md#asset-register`
- [ ] **[V2-043] Acquire or commission one coherent final asset set** - Verify exact-item licenses and avoid unrelated pack mixing; keep restricted source files out of the public bundle. `Depends: V2-041, V2-042` `Ref: visual-assets.md#acquisition-order`
- [ ] **[V2-044] Normalize and optimize final GLBs in Blender** - Apply scale/axes/transforms, ground pivots, animation naming, material atlases, texture budgets, and root-motion rules. `Depends: V2-043` `Ref: visual-assets.md#technical-delivery-requirements`
- [ ] **[V2-045] Replace temporary slice assets and complete renderer parity** - Integrate final fighters, environment, animations, loading/fallbacks, audio, VFX, spectator, reconnect, replay, and results. `Depends: V2-044` `Ref: architecture.md#stage-c-parity-migration`
- [ ] **[V2-046] Run Three.js cross-browser, lifecycle, and performance gates** - Execute full E2E, visual screenshots, context/lifecycle checks, asset-path tests, frame profiling, and transfer-size review. `Depends: V2-045` `Ref: testing.md`
- [ ] **[V2-047] Cut over to Three.js and remove Phaser** - Make Three.js production default, remove the development switch and unused Phaser files/dependency, then run repository-wide reference and build checks. `Depends: V2-046` `Ref: architecture.md#stage-d-cutover`

## Phase 8 - Release readiness

- [ ] **[V2-048] Complete repository-wide CI and local multiplayer verification** - Run format, lint, typecheck, all tests, build, full local E2E, and manual 2-4 player smoke. `Depends: V2-047` `Ref: testing.md#required-commands-during-implementation`
- [ ] **[V2-049] Perform final hidden-information and token review** - Audit public schemas, messages, logs, test hooks, asset metadata, and browser storage. `Depends: V2-048` `Ref: testing.md#privacysecurity-checks`
- [ ] **[V2-050] Deploy and verify server/client compatibility** - Deploy authoritative contract changes and static client through their existing channels; record exact builds and health separately. `Depends: V2-048, V2-049` `Ref: architecture.md#deployment-boundary`
- [ ] **[V2-051] Run live two-player and reconnect journeys** - Verify join, Hunt, repeated sonar, Commit, Resolve, elimination, replay, spectator, refresh recovery, and production asset paths in a real browser. `Depends: V2-050` `Ref: main.md#definition-of-done`
- [ ] **[V2-052] Close v2 progress with evidence and remaining boundaries** - Mark only completed tasks, link playtest/visual/deployment evidence, record final values/licenses, and distinguish local, browser, live, and unverified physical-device claims. `Depends: V2-051` `Ref: state.md`
