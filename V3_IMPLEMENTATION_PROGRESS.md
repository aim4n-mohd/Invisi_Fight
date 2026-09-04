# Invisi Fight V3 implementation progress

Authoritative specification: `v3-build-plan-artifacts/V3-build-plan.md`

## Baseline (2026-09-03)

- Checkout before implementation: `main` at `0e65121dfc18ebb6f14394e26df8622748fd39bc`.
- `pnpm.cmd run ci`: passed after rerunning unchanged outside the restricted filesystem; 35 test files / 95 tests, lint, typecheck, and builds passed.
- `pnpm.cmd run test:e2e`: passed all 12 existing Classic scenarios on Chromium, Firefox, and WebKit.
- The V3 plan directory was already untracked and is preserved as user-owned input.

## Implementation and acceptance audit (2026-09-04)

The complete 1,443-line plan was read before implementation and reread during the final audit. Implementation is local; manual perception/device checks and deployment are separate release gates, not implied by automated passes.

| Phase | Implemented scope                                                                                                             | Acceptance evidence                                                                                                                           |
| ----- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | Baseline, Classic configuration characterization, existing privacy/lifecycle tests, independent Classic E2E tag               | Baseline 95 tests and 12 browser scenarios passed before changes                                                                              |
| 1     | Common/Classic/Echo config, immutable room mode, protocol 3, strict new messages, mode-aware joins/invites                    | Config, phase, network contract tests; wrong-mode room join rejected                                                                          |
| 2     | Four active seats independent of spectators, harmless practice, server countdown, final-roster fair spawns and reset          | Real-room integration tests for dirty practice reset, countdown cancellation, late/fifth join, Classic cap                                    |
| 3     | Arrow parity, Echo run speed, displacement-driven anonymous footsteps, bounded jitter, one-use active decoy                   | Input, sound and geometry tests; movement privacy retained; decoy edge path stops rather than slides                                          |
| 4     | Server-origin immediate non-piercing shots, three hearts, cooldown, full-arena private sonar, Final Echo, result stats/winner | Combat tests; full 2/3/4-player server loops; spectator action rejection and private-message checks                                           |
| 5     | Bounded event queues, prediction reconciliation, Echo-only visual profile, public event reveals, pooled mixed audio           | Queue/expiry, renderer disposal, visibility, camera framing, audio mixer and denied-audio tests; five original validated WAVs                 |
| 6     | Stable viewport Echo canvas, measured bottom HUD, local noise meter, settings/fullscreen, reduced-motion handling             | Canvas identity through lifecycle/session refresh; settings parsing/persistence; four viewport framing tests                                  |
| 7     | Minimal mode entry, muted lazy attract scene, staged controls modal, base-path-aware invites, advisory availability           | Modal double-submit/Back tests, invite round trip, immediate/periodic/visibility health probes, transport independence and cancellation tests |
| 8     | In-arena results, room-local score, request-ordered opt-in rematch, retained eliminated identity, signed reconnect            | Used-decoy and sequence restoration, refreshed spectator readiness, queue overflow/cancellation, host transfer and Classic replay coverage    |
| 9     | Final spec/diff audit and local automated validation complete                                                                 | 148 tests and all 15 browser scenarios passed; real Brave/audio/performance and live-release gates remain open                                |

## Bugs and audit corrections

- Removed the health-check gate from actual room operations; a failed/CORS-blocked probe no longer prevents a working room connection. Availability remains advisory and reports outcomes without exposing session tokens or hidden coordinates.
- Cancelled create/join operations no longer capture a later entry intent or clear its pending request when an old response arrives. Old-room callbacks are ignored after replacement/leave.
- Stationary authoritative private snapshots can refresh their server timestamp without requiring a changed input sequence. New-match reset preserves genuinely fresh private messages that arrive before the public phase patch.
- Restored action sequence/readiness state after reconnect; next-match sequence is separate so spectators can ready/cancel without receiving private combat cooldowns.
- Eliminated Echo fighters keep roster identity; spectators receive no private movement, sonar, noise, or combat action-status data.
- Fixed decoy diagonal boundary sliding, public-shot prediction double audio/impact, and stale winner capture across the short results hold.
- Classic lobby/replay now obeys the specified four-active-fighter ceiling and prioritizes existing participants. Classic speed, health, timings, shot geometry, sequential resolution and host Start remain unchanged.
- Guarded denied AudioContext construction; focused controls retain their key releases. Classic invite links now carry Classic mode and provide a clipboard fallback.
- Echo sonar snapshot/quantization tuning now comes from its own policy, with Classic defaults unchanged.
- Kept next-match button text nodes stable between HUD updates after WebKit exposed missed clicks during repeated label replacement. Added a DOM identity regression assertion.
- Echo shots now select an overlapping opponent at distance zero before a farther target; this opt-in geometry behavior does not alter Classic shots.
- Held movement survives Echo countdown/Final Echo transitions; input resets only for a new match or results. Added seven lifecycle cases.
- The local noise meter now changes its actual fill color with intensity in both Firefox and WebKit, rather than stretching a full gradient into every fill level.
- Removed obsolete landing-card CSS and unused footstep accumulation. Retained only intentional availability/connection diagnostics and the development-only renderer-fallback explanation.
- Replaced the obsolete blocking `ServerWakeService` and its old tests with advisory availability and transport-independence coverage. Removed tracked files remain recoverable from Git history.

## Validation record

- Final `pnpm.cmd run ci` passed: 45 test files / 148 tests, lint, all typechecks, and production builds.
- Final `pnpm.cmd run test:e2e` passed all 15 scenarios across Chromium, Firefox, and WebKit (4.9 minutes), covering Echo and Classic lifecycle, keyboard input, session refresh, and narrow viewport behavior.
- Repository-wide `format:check` passed; `git diff --check` passed.
- Focused real-room suite: 10 tests passed, including full 3/4-player FFA, private sonar routing, spectator rejection, rematch, reconnect, and Classic capacity.
- An intermittent results assertion was traced to the tests freezing `Date.now()` before the configured impact hold expired. Tests now explicitly advance virtual server time through that hold; gameplay timing was not changed.
- Earlier browser failures were traced to source-edit reload contamination and the unstable ready-button label; the clean final run passed. A Classic test also missed its short Commit window while creating a spectator renderer; it now waits for a fresh authoritative Hunt before Commit, with no arbitrary delay or weakened assertion.
- In-app browser: inspected the local Echo practice canvas, fighter and full bottom-safe arena/HUD, landing mode choices, and settings focus restoration. Actual fullscreen operation was not confirmed in the embedded browser and remains a manual gate. This is not physical-device or real Brave evidence.
- ChipTone-generated walk/run/hit/miss/ambient assets validated as mono 44.1 kHz, 16-bit PCM, without validator errors; provenance and measured lengths are in `client/src/assets/audio/ECHO_AUDIO.md`.

## Significant implementation adaptations

- Kept the existing authoritative room and Classic lifecycle intact, adding focused Echo boundary methods plus small sound/geometry services instead of splitting/copying the whole room. This follows the repository's ownership model and avoids a broad Classic refactor.
- The public Colyseus schema is a mode-tagged superset. Echo keeps legacy reveal/aim fields at hidden sentinels; only short-lived shot events intentionally expose an origin/impact. Cooldowns and live positions remain private.
- Preserved `lastShot` for Classic while adding bounded Echo queues. Echo always uses Three.js; the Phaser engineering fallback is still Classic-only.
- Read the existing RPS landing reference and reused only its lifecycle principles, not its gameplay. Audio assets were produced with the ChipTone skill and routed through one gesture-unlocked mixer.
- Not every early implementation substep was test-first. Regression tests and final gates cover the implemented behavior; no tests were disabled or errors suppressed to obtain a pass.

## Open release gates / manual checklist

1. Play a real 1v1 and 3/4-player FFA: compare faint walking, louder running, identical decoy footsteps, shot/hit/miss clarity, Final Echo pressure, and the small camera kick. Verify headphones, speakers, mono, very low volume and mute. Initial recommended tuning is preserved, not claimed play-balanced.
2. Verify held WASD/arrows + Shift, right-click only inside Echo canvas, Space, settings focus, blur/tab switch, fullscreen rejection and reduced-motion OS preference.
3. Exercise initial countdown disconnect/reconnect, mid-match transport loss/refresh, elimination spectating, a fifth arrival, results joins, readiness cancellation/overflow, and several rematches. Confirm clean reset and one stable Echo canvas. Run one manual Classic host-start through replay loop and optionally its Phaser fallback.
4. Run actual Chrome and Brave (Shields on/off), already-awake and genuinely cold server, hidden-tab return and impaired-network cases. A Playwright Chromium pass does not prove the known real Brave issue resolved.
5. Deployment has not been performed. Release requires approval of the intended commit and server-first protocol-5 deployment (including the automatic-only reload refinement below), then the matching Pages client. Check the live health SHA/protocol, client commit, CORS and WebSocket connection from the production URLs before calling V3 live.

Existing non-blocking warnings: large Three.js/Phaser production chunks and a Three.js shadow-map deprecation warning; Classic integration fixtures also print pre-existing unregistered shot-lock listener warnings. No dependency upgrades or unrelated rendering rewrites were introduced to silence them.

## User-requested HUD and magazine revision (2026-09-04)

This later request supersedes the original no-ammo/reload and bottom-only/results-panel requirements. The build-plan input itself is unchanged.

- Replaced the native mode listbox with two side-by-side, keyboard-accessible buttons. Selected mode has a high-contrast teal border/fill, check mark and `aria-pressed` state.
- Enlarged Echo's arena and fighters proportionally using tighter framing and a shallower camera angle. Simulation bounds, movement speeds, hit radii and Classic camera behavior are unchanged. Full arena corners are checked against measured top/bottom overlays.
- Moved room/roster information top left and room code/copy link/settings/leave controls top right. Bottom HUD uses illustrated health, three-bullet ammo, sonar, decoy and sound cards, with a compact responsive layout. Practice text is now exactly “Waiting for players: free practice”. Original code-native icons are used; no third-party game assets were copied. Reference principle: persistent weapon/ability control prompts, as documented in [Apex Legends' official accessibility guide](https://www.ea.com/able/resources/apex-legends/pc/features).
- Added Echo-only three-round magazines, retained the 650 ms fire interval, and configured a 1,800 ms reload. R/button reloads a partial magazine; empty magazines reload automatically. Reserve ammo is unlimited. Server owns consumption, reload deadlines, authentication, sequence rejection and resets. Owner-only state survives reconnect; spectators receive no ammo/reload data. Completed reloads are resolved by the existing simulation tick, not delayed callbacks that can outlive a match.
- Added a validated original ChipTone reload clack routed through the existing SFX/master mixer. Owner-only playback does not reveal hidden opponents; the HUD shows bullet icons, numeric ammo and reload progress.
- Replaced the expandable results strip with a modal popup: winner treatment, individual fighter/stat cards, optional detailed stats and room-win totals, with opt-in rematch controls. Escape/Back returns to the arena; results can be reopened. Modal closes at the next match without replacing the canvas.
- Bumped network protocol to 4 so old clients cannot silently misinterpret the magazine contract. Client and server must be released together, server first. Classic gameplay remains unchanged.

Revision validation: baseline 148 tests passed before changes. Final CI passed all 156 tests across 46 files, lint, typechecks and production builds. Focused Chromium Echo lifecycle/reload and WebKit reload tests passed. In-app browser checks covered selected-mode styling, enlarged arena, desktop/narrow HUD, and results appearance, focus, dismissal and reopening. All 18 browser scenarios are verified across runs: the last full Chromium/Firefox/WebKit run passed 17/18, then the corrected Classic duel passed on all three engines in a focused rerun (3/3). The final correction only changes the test's setup, not runtime code. Format check and diff check passed.

Browser test corrections: Classic automatic-lock evidence is now asserted in the first observed resolution instead of a later lethal round whose canvas can disappear. Fighters aim away during spectator/renderer setup, then deliberately aim at each other for the duel; this prevents the match finishing before the test reaches its combat assertions. WebKit's measured fractional viewport rounded root width to 341 px against 340 px inner width, with no controls outside the viewport; the narrow-layout assertion allows that one-pixel root rounding and still rejects overflowing controls. Neither change alters gameplay timing or disables assertions.

## Automatic-only reload and arena refinement (2026-09-04)

This latest user request supersedes the manual R/button reload, numeric ammo and owner-only reload feedback described above. The original build plan remains unchanged.

- Tightened Echo framing again and reduced HUD card height to give the arena and fighters more screen space. Physics bounds and Classic camera/tuning remain unchanged; arena-corner tests pass at four desktop sizes with camera kick.
- Bullet graphics are the only visible ammo count; accessible ammo labels remain. Removed the numeric count, LMB-ready/cycling text, reload button and R instruction. Removed manual reload input handling and its obsolete protocol, sequence and CSS code.
- Empty magazines wait a configurable 300 ms, then auto-reload over the existing 1,800 ms. Server emits two faint clicks, at start and completion, using the original reload clip at walking intensity. Both produce walking-style anonymous approximate-position rings for every peer. No shooter ID, true position, live ammo or deadline is broadcast.
- Reload advancement uses the authoritative simulation tick and fire-request path, with no delayed callbacks. Pending clicks are cleared on magazine reset, player removal and room disposal; inactive/dead fighters do not emit them. Reconnect retains progress without replaying the first click. Private refill acknowledgement allows firing again.
- Public sound profile change bumps protocol to 5; release matching client and server together, server first. Nothing has been deployed.

Validation: new weapon tests were observed failing before implementation. The first post-change test run exposed stale built shared configuration; rebuilding the shared package corrected module resolution without suppressing errors. Full lint, typechecks, tests and production builds pass, including Classic regression coverage. New tests cover click cadence/deduplication, empty-only refill, reset cancellation, shared walking reveal properties, soft renderer playback, spectator routing and reconnect. Desktop appearance was inspected with the browser skill; final browser/format results are recorded below.
Final refinement checks: all six Echo Playwright scenarios passed in one run across Chromium, Firefox and WebKit (2.8 minutes), including icon-only ammo, unbound R, automatic refill, narrow-screen controls, private spectator state and rematch. Repository-wide formatting and diff whitespace checks passed. In-app practice verified the three bullet states and automatic refill without numeric ammo or a reload button. No new unresolved implementation issues; manual headphone/speaker tuning and the existing real-Brave/live-release gates remain.

## Release candidate: sonar and taller arena (2026-09-04)

- Set Echo sonar cooldown to the user's clarified 10,000 ms; reveal duration remains 2,000 ms and Classic cooldown remains 3,000 ms.
- Increased the camera elevation for a taller board aspect (about 18% greater visible height-to-width ratio). World dimensions and collision/movement remain unchanged. Corner clearance, proportional projection and unchanged Classic framing are regression-tested.
- Release gate: Pages checks out the CI-tested SHA and waits for that exact SHA from server health before publication. This avoids shipping a new protocol client against an old server. No hosting/account/tier changes.
- Local full CI passed: 159 tests / 46 files, lint, typechecks and builds. New timing and aspect tests were observed failing before implementation. Format/diff checks passed; the taller practice arena was visually inspected using the browser skill. Browser and live-release evidence will be reported after completion.
  Release browser regression correction: WebKit exposed a Classic fixture assuming a fixed 3.1-second wait would remain in Hunt. The fixture now waits for authoritative Hunt/readiness with time left, compares sonar counts relative to the current round, and keeps setup aim harmless. Its overall timeout allows multiple real-time rounds under software WebGL; no runtime timing or assertions were removed. The corrected full 18-scenario cross-browser suite passed, including all Echo and Classic scenarios. Lint and diff checks passed after this test-only correction.
