# V2 contract migration map

Captured for `V2-003` on 2026-08-26 before runtime edits.

## Shared configuration and types

| Current boundary                      | V1 behavior                                                                                           | V2 migration                                                                                                                                                                     |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shared/src/config/gameplayConfig.ts` | 10-second planning, rotating 2-second wedge, 1.25-second fade, 350 ms shot pause, 3 hearts, 190 px/s. | Add Hunt/Commit/Recap, manual pulse/cooldown/radius/snapshot/quantization, readable resolution timings, 2 hearts, and 165 px/s. Remove legacy wedge exports after Phaser parity. |
| `shared/src/types/match.ts`           | `lobby                                                                                                | planning                                                                                                                                                                         | resolution | results`; private state, wedge snapshot, shot, and input types. | Replace `planning` with `hunt` and add `commit`/`recap`; add sonar request/status/emission, shot lock/status, and recap types. |
| `shared/src/types/network.ts`         | Validates join options and combined movement/aim input.                                               | Validate manual sonar and shot-lock requests; preserve numeric timestamp normalization and session-token rules.                                                                  |
| `shared/src/index.ts`                 | Exports config, UI, match/network types, and geometry.                                                | Export new v2 contracts and retain only genuinely shared geometry.                                                                                                               |

## Authoritative server state and lifecycle

| Current boundary                              | V1 dependency                                                                                                                                                             | Required change                                                                                                                                                                                                                        |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `server/src/rooms/InvisiFightRoom.ts`         | Registers player input/start/replay; simulates only `planning`; samples sonar every tick; starts planning; immediately resolves at deadline; uses 350 ms shot scheduling. | Register sonar/lock requests; accept movement only in Hunt and aim in Hunt/Commit; replace automatic sample loop; implement Hunt -> Commit -> Resolve -> Recap; schedule anticipation/result pacing; reset/reconnect v2 private state. |
| `server/src/rooms/InvisiFightRoomState.ts`    | Public phase/timestamps, reveal positions, locked aim, active shooter, order, winner.                                                                                     | Accept new phases; add only public recap data if schema-backed. Keep exact Hunt/Commit positions, aim, lock, cooldown, and detections out of public state.                                                                             |
| `server/src/rooms/InvisiFightRoomMessages.ts` | Session, combined input, start/replay, private state/sonar, shot, error.                                                                                                  | Add `input:sonar`, `input:lock`, `private:sonar-status`, `private:lock-status`, `match:sonar-emission`, and recap delivery if event-backed.                                                                                            |
| `server/src/services/MatchClock.ts`           | Produces one planning window.                                                                                                                                             | Produce deterministic Hunt, Commit, and Recap windows using injected time.                                                                                                                                                             |
| `server/src/services/SonarService.ts`         | Samples an infinite-radius rotating wedge once per detector/target/cycle.                                                                                                 | Validate per-player cooldown, radial detection, fixed snapshot expiry, and quantized public origin. Remove tick-driven cycle state.                                                                                                    |
| `server/src/services/CombatResolver.ts`       | Uses locked aim, first ray hit, 1-heart damage, cancellation, and fatal outcome.                                                                                          | Retain ray rules; consume the final explicit/automatic lock and new 2-heart initialization.                                                                                                                                            |
| `server/src/services/RoomAuthService.ts`      | Treats any non-lobby join as spectator.                                                                                                                                   | Update tests/naming for Hunt, Commit, Resolution, Recap, and Results without weakening role rules.                                                                                                                                     |

## Client networking and stores

| Current boundary                           | V1 dependency                                                                                                                                                      | Required change                                                                                                                                                     |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `client/src/network/colyseusClient.ts`     | Sends combined input; listens for private state/sonar and shot; exposes locked aim only in Resolution; routes non-lobby/results active players to match/spectator. | Add sonar and lock commands/listeners; map recap/emissions; restore private cooldown/lock state; expose locked aim in Resolution/Recap only; preserve role routing. |
| `client/src/state/privateSnapshotStore.ts` | Stores own state and expiring sonar detections.                                                                                                                    | Store cooldown readiness/status, explicit/automatic lock acknowledgement, and predicted/accepted local pulse while preserving frozen detections.                    |
| `client/src/state/matchViewStore.ts`       | Stores public match view and last shot.                                                                                                                            | Store public sonar emissions, resolution events/recap, and clear phase-specific transient state deterministically.                                                  |
| `client/src/state/sessionStore.ts`         | Stores identity and reconnect tokens in `sessionStorage`.                                                                                                          | Preserve behavior; onboarding completion may use a separate nonsensitive session flag only.                                                                         |

## Phaser gameplay presentation

| Current boundary                               | V1 dependency                                                                             | Required change before Three.js gate                                                                                                                  |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `client/src/game/scenes/ArenaScene.ts`         | Sends movement/aim and draws rotating sonar only during `planning`.                       | Send movement in Hunt, aim in Hunt/Commit, Space sonar requests, and click lock requests; render phase-specific systems without automatic sweep math. |
| `client/src/game/systems/RenderSystem.ts`      | Local fighter in Planning; all revealed fighters in Resolution/Results.                   | Local fighter in Hunt/Commit; frozen fighters in Resolution/Recap/Results; active shooter and hit state remain readable.                              |
| `client/src/game/systems/SonarRenderSystem.ts` | Draws a rotating wedge and shows a detection only while it remains inside the live wedge. | Draw local/public expanding pulses and fixed snapshots for their full server-defined lifetime, independent of pulse geometry.                         |
| `client/src/game/systems/AimRenderSystem.ts`   | Provisional line in Planning; public locked lines in Resolution.                          | Provisional/accepted lock styling in Hunt/Commit and public locked lines only in Resolution/Recap.                                                    |
| `client/src/game/systems/EffectsSystem.ts`     | 320 ms tracer/muzzle/impact driven by last shot.                                          | Align anticipation, discharge, hit/miss, damage hold, and cancellation with the 1.2-second server resolution beat.                                    |

## DOM HUD, copy, and styles

| Current boundary                                 | V1 dependency                                                        | Required change                                                                                                |
| ------------------------------------------------ | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `client/src/app/screens/MatchScreen.ts`          | Static “Stay unreadable” instructions and compact four-column HUD.   | Compose phase/action hierarchy, large countdown, sonar cooldown, lock status, order, health, and recap.        |
| `client/src/app/screens/SpectatorScreen.ts`      | Public resolution viewing and compact spectator HUD.                 | Support all v2 public phases/recap without controls or private feedback.                                       |
| `client/src/app/screens/LandingScreen.ts`        | Copy describes “planning” and private sonar.                         | Update terminology after the gameplay contract compiles.                                                       |
| `client/src/components/hud/PhaseLabel.tsx`       | Displays the raw phase except Results.                               | Add user-facing Hunt, Commit, Resolve, Recap, and Results labels.                                              |
| `client/src/components/hud/TimerDisplay.tsx`     | Compact 0.1-second timer with a 3-second warning.                    | Build persistent large whole-second Hunt countdown and appropriate smaller non-Hunt timing.                    |
| `client/src/components/hud/HeartMeter.tsx`       | Assumes the supplied heart count but current screens initialize 3.   | Render 2-heart state and transitions without layout shift.                                                     |
| `client/src/components/hud/FiringOrderPanel.tsx` | Shows order and active shooter badge.                                | Increase active-shooter emphasis and preview rotated order during Recap.                                       |
| `client/src/styles/global.css`                   | Four-column 64 px HUD; `planning`, `resolution`, and results styles. | Add stable responsive tracks for countdown/action states and new phase selectors; retain reduced-motion rules. |

## Tests requiring migration

| Test area            | Current references                                                                    | Required v2 coverage                                                                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared config        | `shared/tests/gameplayConfig.test.ts`                                                 | All locked/default v2 values and derived network constants.                                                                                               |
| Shared geometry      | `shared/tests/geometry.test.ts`                                                       | Retain ray tests; remove wedge-only tests after migration; add radial boundary/quantization helpers if shared.                                            |
| Match clock          | `server/tests/matchClock.test.ts`                                                     | Hunt, Commit, and Recap exact windows/expiry.                                                                                                             |
| Sonar                | `server/tests/sonarService.test.ts`                                                   | Authorization, cooldown edges, radial detection, snapshot expiry, quantization, reset/reconnect.                                                          |
| Authorization        | `server/tests/roomAuthService.test.ts`                                                | Every non-lobby v2 phase joins as spectator.                                                                                                              |
| Public privacy       | `server/tests/publicStatePrivacy.test.ts`                                             | Prohibit exact hidden position/velocity/aim/lock/cooldown/detections in Hunt/Commit.                                                                      |
| Room integration     | `server/tests/roomLifecycle.integration.test.ts`                                      | Hunt start, manual sonar routing, Commit lock/fallback, readable scheduling, Recap, reconnect, replay reset.                                              |
| Client stores/render | `client/tests/privateSnapshotStore.test.ts`, `client/tests/sonarRenderSystem.test.ts` | Cooldown/lock status, full snapshot lifetime, public emission, and new renderer states.                                                                   |
| Browser journeys     | `client/e2e/multiplayer.spec.ts`                                                      | Large 15-second countdown, reduced speed, sonar cooldown/reuse, explicit/automatic lock, paced Resolution, 2 hearts, Recap, reconnect, spectator, replay. |

## Search terms used for completeness

Before each related task, re-run scoped searches for:

```text
planning
planningDurationMs
sonarRotationPeriodMs
sonarWedgeDegrees
sonarFadeDurationMs
shotResolutionPauseMs
startingHearts
playerSpeedPxPerSecond
private:sonar
match:shot
phase-label--
```

Generated v1 documentation is historical and does not need terminology migration. Runtime source and active tests do.
