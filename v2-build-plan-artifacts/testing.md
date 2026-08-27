# V2 testing and playtest strategy

## Principle

Automated tests prove correctness, authority, privacy, compatibility, and rendering invariants. They cannot prove that the game is enjoyable or understandable. V2 therefore requires both automated gates and observed playtests.

## Test-first rule

For every gameplay task:

1. Add or update a failing deterministic test.
2. Implement the smallest server/shared change.
3. Add client/store/UI coverage.
4. Run the focused suite.
5. Run the broader affected package suites before marking the task complete.

Renderer visual tasks may use test-after implementation, but coordinate mapping, state filtering, timers, lifecycle cleanup, and asset fallbacks still require automated tests.

## Unit coverage

- V2 config defaults: 15-second Hunt, 3-second Commit, 3-second sonar cooldown, 165 px/s speed, 2 hearts, recap and resolution timings.
- Phase transition rules and server timestamp windows.
- Sonar cooldown acceptance at exact boundaries.
- Radial detection inclusion/exclusion at radius edges.
- Scanner-origin quantization without exposing exact coordinates.
- Frozen snapshot expiry independent of pulse position/animation.
- Shot lock validation, replacement sequencing, and automatic fallback.
- Input acceptance: movement only during Hunt; aim during Hunt/Commit; no sonar outside Hunt.
- Existing overlap separation, first-ray hit, non-piercing behavior, cancellation, order rotation, and winner rules.
- Countdown formatting and warning thresholds.
- Coordinate conversion between server 2D and Three.js X/Z.
- Ground pointer projection to aim angle.
- Fighter visibility selection for local, private snapshot, resolution, and spectator states.

## Integration coverage

- Two clients enter Hunt with synchronized phase timestamps.
- A valid sonar request produces private target snapshots only for the detector and a quantized public emission for opponents.
- A cooldown request is rejected without changing readiness or leaking detections.
- Reconnect restores the player's own cooldown and lock state without resetting phase time.
- Commit freezes movement while accepting aim and lock updates.
- Locked aim remains private until Resolve.
- An absent explicit lock produces the documented automatic lock.
- Resolution exposes only the intended frozen public state, runs at the configured pacing, and produces recap entries.
- Spectators receive no private sonar, cooldown, position, provisional aim, or lock acknowledgement.
- Replay clears cooldown, lock, snapshot, recap, and phase state.
- Client networking schema rejects malformed v2 events safely.

## End-to-end coverage

Automate the smallest reliable high-value flows:

- Two players create/join/start and see a synchronized large 15-second countdown.
- Held WASD moves at the lower configured rate and stops at Commit.
- Sonar activates, shows cooldown, cannot be spammed before 3 seconds, and can activate again after readiness.
- Commit accepts a deliberate click lock and shows confirmation.
- A no-click player receives automatic-lock feedback rather than a silent lost turn.
- Resolution makes the active shooter and hit/miss outcome readable before advancing.
- Two-heart elimination leads to Results and replay-to-lobby.
- Refresh recovery works during Hunt and Commit.
- A late spectator receives the public arena without private information or controls.
- Three.js cutover repeats the full-match suite in Chromium, Firefox, and WebKit.

Do not make all E2E assertions depend on pixel-perfect VFX timing. Expose limited test-only semantic state on the arena host where necessary, without exposing hidden opponent data.

## Privacy/security checks

- Structural tests prohibit exact live opponent `x`, `y`, velocity, provisional aim, lock state, sonar readiness, and detected targets from public Hunt/Commit schema.
- Network logs must not contain session/reconnect tokens or private positions.
- Quantized sonar emission tests prove the public origin is derived from the configured grid and not the exact source coordinate.
- Browser/test hooks must never expose hidden state that production code otherwise protects.
- Dependency and asset-license review occurs before production cutover.

## Three.js visual verification

Use Playwright screenshots and canvas-pixel checks at minimum for:

- 1920 x 1080 desktop.
- Existing 1904 x 884 regression viewport.
- A smaller supported desktop/laptop viewport.
- The current narrow responsive regression viewport for shell overflow, even if gameplay remains desktop-first.

Verify:

- Canvas is nonblank and fills the intended frame.
- Entire arena is framed without fighter/HUD overlap.
- Countdown, cooldown, lock status, health, and firing order fit.
- Fighters, pulse, hologram, aim, active shooter, tracer, and impact appear in the correct states.
- Assets load from the production base path.
- Resize does not distort pointer projection or coordinate mapping.
- Reduced motion removes nonessential movement while keeping state changes understandable.

## Performance and lifecycle checks

- Measure FPS/frame time with four fighters, repeated sonar, and full sequential resolution.
- Record compressed asset transfer size and largest GLB/texture contributors.
- Test WebGL context loss/recovery where practical.
- Enter and leave match/spectator screens repeatedly and check that RAF loops, event listeners, geometries, materials, textures, and audio are released.
- Verify no duplicate input/network handlers after replay or reconnect.
- Compare bundle size before and after Phaser removal.

## Moderated clarity playtest

Run with at least five people who have not been taught the rules. Do not explain the controls or phase sequence before their first round beyond how to join.

After round one, ask each player:

- What were you trying to do during Hunt?
- What did sonar give you, and what did using it reveal to others?
- When and how did your shot become locked?
- Who fired first, and why did the shot hit or miss?
- How much health remained?

Clarity gate:

- At least 4 of 5 correctly identify Hunt, sonar cooldown/risk, Commit, and Resolve after one round.
- At least 4 of 5 can explain their own first shot outcome.
- No participant misses the phase change because the countdown or active-shooter cue was unclear.

## Fun playtest

After participants understand the loop, run several matches and record:

- Whether scan timing creates a meaningful choice.
- Whether movement has an intentional goal or feels random.
- Whether 15 seconds feels tense or slow.
- Whether 3-second sonar cooldown causes excessive detection.
- Whether 165 px/s feels controllable.
- Whether two hearts create satisfying match length.
- Whether players choose an immediate rematch.

Fun gate:

- A majority report at least one meaningful scan/position/aim decision per round.
- A majority choose or request a rematch without prompting.
- Repeated confusion is fixed before Three.js work begins.
- If understanding is high but movement remains strategically empty, open the separate cover-design decision; do not add unrelated mechanics.

## Required commands during implementation

Focused commands vary by task, but each phase closes with:

```powershell
pnpm.cmd run format:check
pnpm.cmd run lint
pnpm.cmd run typecheck
pnpm.cmd run test
pnpm.cmd run build
```

Relevant multiplayer phases also run:

```powershell
pnpm.cmd run test:e2e
```

Deployment verification is a separate final gate and must record the live client URL, server health response/build identity, browser used, and exact scenario completed.
