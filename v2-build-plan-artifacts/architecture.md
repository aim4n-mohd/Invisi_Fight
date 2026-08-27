# V2 architecture and migration plan

## Architectural principle

Gameplay is still an authoritative 2D simulation. Three.js is a presentation system, not the source of truth.

```text
2D server x -> Three.js world X
2D server y -> Three.js world Z
Three.js world Y -> visual height only
```

The arena remains `960 x 540` simulation units. Character visual meshes may be taller than the collision circle, but gameplay intersections continue using server-side 2D geometry.

## Preserved systems

- Colyseus room creation, joining, transport, server authority, and reconnect pattern.
- Session tokens in `sessionStorage` and no sensitive identifiers in URLs/logs.
- Public/private information separation.
- Existing deterministic movement boundary, overlap separation, ray-hit, order rotation, damage, elimination, and winner concepts unless changed in `gameplay.md`.
- DOM landing, lobby, connecting, match HUD, spectator, results, and replay screens.
- Zustand/client state separation and server-aligned clock.
- GitHub Pages client and Render server topology.

## Contract changes

### Match phases

Replace the v1 `planning` phase with:

- `hunt`
- `commit`
- `resolution`
- `recap`

Retain `lobby` and `results`.

Migration must update exhaustive switches, CSS selectors, tests, screen routing, reconnect restoration, and server room transitions together.

### Client-to-server messages

- Existing movement input remains valid only in Hunt.
- Aim updates remain valid in Hunt and Commit.
- Add `trigger_sonar` with sequence and session authorization.
- Add `lock_shot` with angle, sequence, and session authorization.

### Private server-to-client events

- `private_state`: own position, velocity, provisional aim, and server time.
- `private_sonar_snapshot`: target snapshot for the detector only.
- `sonar_status`: accepted/rejected activation and authoritative `readyAtServerMs`.
- `shot_lock_status`: accepted angle, source, sequence, and server time for the locking player only.

### Public server-to-client events/state

- Public phase/timestamps, health, firing order, active shooter, results, and reconnect-safe room state.
- `sonar_emission`: emitter identity, quantized approximate origin, visual radius, and timestamp. This is an intentional v2 risk/reward disclosure.
- Resolution reveal positions and locked aims only after Resolve begins.
- Shot events and recap entries.

No public Hunt/Commit schema may contain exact live opponent position, velocity, provisional aim, exact sonar origin, detected targets, or private cooldown status.

## Gameplay implementation boundaries

- `shared/src/config/gameplayConfig.ts`: all v2 durations, speed, sonar, health, and pacing values.
- `shared/src/types/match.ts`: phase, lock, recap, sonar, and public/private domain types.
- `shared/src/types/network.ts`: request/event schemas and validation.
- `server/src/services/MatchClock.ts`: Hunt, Commit, Recap windows and server timestamps.
- `server/src/services/SonarService.ts`: cooldown validation, radial sampling, quantized emission creation, snapshot creation.
- `server/src/services/CombatResolver.ts`: retain ray hits and damage; consume explicit/automatic lock result.
- `server/src/rooms/InvisiFightRoom.ts`: authoritative phase state machine and message routing.
- `client/src/network/colyseusClient.ts`: typed sonar and lock commands/events.
- `client/src/state/privateSnapshotStore.ts`: snapshots, sonar status, and lock acknowledgement.
- `client/src/state/matchViewStore.ts`: phase, recap, public emissions, and resolution view data.
- `client/src/app/screens/MatchScreen.ts`: countdown, cooldown, lock, order, health, and recap composition.

## Renderer migration strategy

Do not combine gameplay redesign and renderer replacement in one debugging surface.

### Stage A: validate in Phaser

- Implement the v2 loop and feedback with simple Phaser graphics.
- Retain existing render systems where practical.
- Pass correctness, privacy, clarity, and fun gates.

### Stage B: Three.js vertical slice

- Add `three` and plain TypeScript renderer modules; do not introduce React Three Fiber.
- Keep Phaser available behind a development-only renderer switch while the slice is incomplete.
- Render one complete Hunt -> Commit -> Resolve -> Recap cycle using temporary assets.
- Confirm pointer-to-ground aiming, coordinate mapping, resize behavior, and hidden-state filtering.

### Stage C: parity migration

Suggested client structure:

```text
client/src/game-three/
  ThreeGame.ts
  scenes/ArenaScene.ts
  camera/CameraController.ts
  input/GroundAimProjector.ts
  renderers/ArenaRenderer.ts
  renderers/FighterRenderer.ts
  renderers/SonarRenderer.ts
  renderers/AimRenderer.ts
  renderers/ShotEffects.ts
  renderers/RecapRenderer.ts
  assets/AssetLoader.ts
  animation/FighterAnimator.ts
  lifecycle/disposeScene.ts
```

Responsibilities:

- `ThreeGame`: renderer, scene, clock, resize loop, lifecycle, context loss/recovery.
- `CameraController`: fixed orthographic framing; no player-controlled rotation or zoom.
- `GroundAimProjector`: raycasts the pointer against an invisible ground plane and returns a 2D aim angle.
- `ArenaRenderer`: floor, bounds, edge dressing, lighting, shadows, and phase treatment.
- `FighterRenderer`: local, detected, frozen, active-shooter, hit, eliminated, and spectator-visible states.
- `SonarRenderer`: local pulse, opponent approximate emission, snapshot holograms, cooldown-linked feedback.
- `AimRenderer`: provisional and locked trajectories without leaking other players during Hunt/Commit.
- `ShotEffects`: anticipation, tracer, muzzle, hit/miss, damage, audio, and timing.
- `RecapRenderer`: optional world-space emphasis corresponding to the DOM recap.
- `AssetLoader`: GLB loading, progress, fallbacks, shared resources, and errors.
- `FighterAnimator`: idle, move, aim, fire, hit, and elimination animation state.
- `disposeScene`: geometry, material, texture, audio, listener, RAF, observer, and WebGL cleanup.

### Stage D: cutover

- Three.js becomes the default only after parity E2E and visual/performance gates pass.
- Remove the development renderer switch and Phaser dependency in a dedicated cleanup task.
- Delete Phaser-only files only after `rg` confirms no imports or test dependencies remain.
- Re-run bundle, deployment-path, browser, reconnect, spectator, and full-match verification.

## Camera and scene constraints

- Fixed orthographic camera at approximately 45-55 degrees.
- Entire playable arena remains framed on supported desktop viewports.
- No camera motion during Hunt or Commit.
- Resolution may use a restrained emphasis or small zoom only if the arena context and aim path remain readable.
- Real-time lights and shadows are limited; bake or fake most environmental detail.
- Arena edge props stay outside playable space and cannot imply collision inside the flat arena.
- Render interpolation affects visuals only and never changes authoritative positions.

## Asset loading and compression

- Runtime format: `.glb`.
- Use `GLTFLoader`; add Draco/Meshopt or KTX2 only when measured asset size justifies the added decoder/runtime cost.
- Normalize scale, forward axis, ground contact, origin, animation names, materials, and texture color spaces in Blender before import.
- Share geometries/materials where variants permit it.
- Provide a primitive fallback fighter and floor if an optional cosmetic asset fails; fail clearly if a required gameplay-readable asset cannot load.

## Performance targets

- Stable 60 FPS target on a representative mid-range desktop at 1920 x 1080 with four fighters and full VFX.
- No sustained frame time above 20 ms during sonar or sequential resolution.
- Initial compressed gameplay asset transfer target: 10 MB or less; record exceptions with measured benefit.
- Avoid per-frame object allocation in render loops.
- Cap renderer pixel ratio to a measured maximum, initially `2`.
- Dispose all WebGL resources when leaving match/spectator screens or switching renderer during development.

## Deployment boundary

The renderer migration changes the static client bundle only. Server deployment is still required for gameplay contract changes. A successful local build or Pages upload is not evidence that the Render server, secure WebSocket endpoint, or live multiplayer flow is compatible.
