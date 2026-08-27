# V2 context and problem statement

## Current product baseline

Invisi Fight v1 is a deployed desktop browser multiplayer game built as a TypeScript monorepo:

- `client/`: Vite, Phaser 3, DOM/CSS screens and HUD, Zustand state, Colyseus client.
- `server/`: Node.js, Express, Colyseus, authoritative room state and gameplay services.
- `shared/`: gameplay configuration, geometry helpers, match types, and network contracts.
- Tests: Vitest unit/integration coverage and Playwright multiplayer journeys.
- Hosting: GitHub Pages client and Render server.

The v1 server owns live positions, movement, phase timing, sonar sampling, overlap separation, aim locking, firing order, ray hits, damage, winner selection, and disconnect handling. Opponent live position and aim are not placed in public room state during hidden play. Private state and sonar messages are delivered only to authorized clients.

## Current gameplay loop

V1 uses a 10-second `planning` phase followed immediately by `resolution`:

- Players move with WASD and aim with the mouse.
- Opponents remain invisible.
- A 35-degree sonar wedge rotates automatically every 2 seconds.
- The server emits fixed-position private detection snapshots.
- At the timer boundary, the server freezes movement and aim, reveals positions, and fires each locked shot in order.
- Players have 3 hearts.

The important implementation boundaries are:

- `shared/src/config/gameplayConfig.ts`
- `shared/src/types/match.ts`
- `shared/src/types/network.ts`
- `server/src/rooms/InvisiFightRoom.ts`
- `server/src/rooms/InvisiFightRoomState.ts`
- `server/src/rooms/InvisiFightRoomMessages.ts`
- `server/src/services/SonarService.ts`
- `server/src/services/MatchClock.ts`
- `server/src/services/CombatResolver.ts`
- `client/src/network/colyseusClient.ts`
- `client/src/state/matchViewStore.ts`
- `client/src/state/privateSnapshotStore.ts`
- `client/src/app/screens/MatchScreen.ts`
- `client/src/game/scenes/ArenaScene.ts`
- `client/src/game/systems/RenderSystem.ts`
- `client/src/game/systems/SonarRenderSystem.ts`
- `client/src/game/systems/AimRenderSystem.ts`
- `client/src/game/systems/EffectsSystem.ts`

## Why v1 is difficult to understand

The issue is not only visual polish. Movement, aiming, scanning, timing, invisibility, and future firing order all compete for attention during one short phase. The shot is committed implicitly at the deadline, so the player receives little confirmation that they made a deliberate choice.

Two timing interactions materially reduce readability:

- A 35-degree wedge completing a rotation in 2 seconds covers a fixed direction for about `2000 * 35 / 360 = 194 ms`.
- The client currently renders a saved detection only while the live wedge still contains it, making the effective display far shorter than the configured 1.25-second snapshot lifetime.
- Resolution advances every 350 ms while the shot visual itself lasts about 320 ms. The active shooter, trajectory, hit, and heart change are therefore presented almost simultaneously.

## Why v1 is not yet strategically strong

- Sonar is automatic, so it gives information without a player decision or cost.
- An open arena provides limited positional choice beyond moving unpredictably.
- The shot is not explicitly committed, weakening anticipation and ownership of the outcome.
- Three-heart elimination can repeat the same low-information loop for too long.
- The resolution is too fast to create suspense or teach cause and effect.

## V2 design hypothesis

The loop becomes more enjoyable when every round asks three understandable questions:

1. **Where should I move, and when is scanning worth revealing myself?**
2. **Where do I deliberately commit my shot?**
3. **What happened, and how should that change my next decision?**

The redesigned phase structure and feedback must prove this hypothesis before 2.5D art is treated as production work.

## Constraints that remain valid

- Authoritative server and hidden-information privacy remain non-negotiable.
- The game remains playable with 2-4 friends in private rooms.
- Opponent snapshots never track later movement.
- A client may render only its own live state, explicitly public state, and private events intended for that player.
- Spectators never receive private player information.
- Sessions and reconnect tokens remain out of URLs and logs.
- A server restart may still destroy in-memory rooms; v2 does not add a database.
- The initial v2 arena remains flat and obstacle-free even when rendered in 2.5D.

## Open tuning questions

These do not block implementation because defaults are specified in `gameplay.md`, but they must be evaluated at the 2D playtest gate:

- Is `165 px/s` slow enough for readable tracking without feeling unresponsive?
- Does a 3-second sonar cooldown create too much information during a 15-second Hunt?
- Is the proposed pulse radius appropriate for the 960 x 540 arena?
- Is approximate scanner disclosure a meaningful risk or merely visual noise?
- Does two-heart elimination produce the right match length?
- Does Commit need 3 seconds or can it later be shortened?
- Is obstacle-based cover necessary after the basic loop is understandable?

## Evidence boundary

The v1 architecture, test state, and gameplay behavior are source-grounded. The v2 loop, Three.js direction, art style, and balance defaults are design decisions awaiting prototype and playtest validation. Do not report them as proven until their corresponding gates pass.
