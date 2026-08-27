# Invisi Fight v2 build plan

Status: **procedural Three.js 2.5D slice and requested gameplay/UI polish complete; five-person clarity playtest and final asset migration remain**.

This package defines the gameplay-readability redesign and the later Three.js 2.5D presentation migration for Invisi Fight. It is intentionally separate from `build-plan-artifacts/`, which documents the completed v1 Phaser/Colyseus MVP.

## Required read order

An implementation session must read these files in order before editing runtime code:

1. `v2-build-plan-artifacts/main.md`
2. `v2-build-plan-artifacts/context.md`
3. `v2-build-plan-artifacts/gameplay.md`
4. `v2-build-plan-artifacts/architecture.md`
5. `v2-build-plan-artifacts/visual-assets.md`
6. `v2-build-plan-artifacts/testing.md`
7. `v2-build-plan-artifacts/tasks.md`
8. `v2-build-plan-artifacts/state.md`

## Source precedence

When documents or code disagree, use this order:

1. Explicit user decisions recorded under **Locked decisions** below.
2. Existing v1 privacy, session-token, authentication, and authoritative-server protections.
3. The v2 gameplay and architecture specifications in this package.
4. Current runtime code as evidence of the v1 baseline, not as authority over changed v2 behavior.
5. Older generated build-plan material.

Do not weaken hidden-information privacy, reconnect security, or server authority to simplify the renderer migration.

## Product objective

Make the match enjoyable and understandable before improving its presentation. A new player should be able to identify the current phase, know what action is available, deliberately scan and commit a shot, and understand why each shot hit or missed. Once that loop passes playtesting in the existing 2D renderer, migrate only the presentation layer to a fixed-camera Three.js 2.5D tactical diorama.

## Locked decisions

- The active round is split into **Hunt -> Commit -> Resolve -> Recap**.
- Hunt lasts **15 seconds** and has a large, persistent, high-contrast countdown.
- Sonar is manually triggered and has a **3-second server-authoritative cooldown**.
- Triggering sonar reveals private frozen enemy snapshots while intentionally exposing the scanner's approximate origin to opponents.
- Base movement speed is reduced from `190` to a proposed **165 pixels per second**. It remains centrally configurable and must be tuned through playtests.
- Commit lasts **3 seconds**. Movement is locked; mouse aiming remains active; a click explicitly locks the shot.
- Failure to click before Commit ends falls back to the latest valid aim so a first-time player does not silently lose the entire round. The UI must clearly identify an automatic lock.
- Resolution is slowed to approximately **1.2 seconds per shooter**, with a clear active-shooter cue, shot, hit/miss result, and health change.
- Players begin with **2 hearts** rather than 3.
- A brief Recap follows resolution before the next Hunt.
- Initial gameplay changes are proven in the current 2D renderer before the Three.js migration begins.
- V2 uses a fixed orthographic 2.5D camera. The server continues simulating a flat 2D arena.
- The lobby, connection flow, DOM HUD, Colyseus server, session/reconnect model, and public/private state boundaries remain.
- Final art is not purchased or commissioned until a temporary-asset Three.js vertical slice passes readability and performance checks.
- Physical cover and obstacle collision are not part of the initial v2 implementation. They require a separate post-playtest decision.
- The temporary Three.js slice uses a small procedural player model holding a separate gun model that continuously follows mouse aim on the gameplay plane.
- Sonar reaches the full playable arena, accepted local pulses play a short sonar ping, and shot resolution uses a 22 px target radius without changing the 16 px movement body.
- The landing page contains only the brand, one explanation line, fighter name, and create/join controls; the match HUD uses the refined tactical visual system.

## Scope

### Included

- New round phases and server-owned timing.
- Manual cooldown-based sonar and its risk/reward information contract.
- Reduced movement speed and two-heart matches.
- Explicit shot commitment and slower readable resolution.
- Countdown, phase, cooldown, lock, shooter, hit/miss, damage, and recap feedback.
- A short visual onboarding sequence for Move, Scan, Aim, and Lock.
- Retention of multiplayer privacy, reconnect, spectator, replay, and deployment behavior.
- Plain Three.js renderer replacing Phaser after the gameplay gate.
- Stylized tactical-diorama art direction, temporary asset sourcing, GLB pipeline, animation, VFX, and asset licensing records.
- Automated correctness/privacy/regression coverage plus moderated playtests.

### Excluded unless separately approved

- Accounts, persistence, public matchmaking, progression, analytics, monetization, chat, bots, or mobile controls.
- Full 3D physics, free camera rotation, perspective aiming, vertical gameplay, jumping, or camera-controlled movement.
- New weapons, character classes, power-ups, map variants, destructible scenery, or procedural levels.
- Cover, walls, obstacle collision, or line-of-sight blocking in the first v2 pass.
- Final art purchases before the vertical-slice gate.
- Live deployment before all local multiplayer, privacy, browser, and migration gates pass.

## Delivery gates

1. **Rules gate:** deterministic tests prove Hunt, cooldown, Commit, locking, resolution, health, and privacy behavior.
2. **2D clarity gate:** new players can understand and complete the redesigned loop without facilitator instruction.
3. **Fun gate:** playtest evidence supports continuing with the loop or records the smallest required rule adjustment.
4. **3D slice gate:** one complete round is readable in Three.js using temporary assets at real gameplay size.
5. **Asset gate:** camera, scale, silhouette, animation list, performance budget, and license requirements are stable before final art acquisition.
6. **Migration gate:** Three.js reaches functional, privacy, browser, and performance parity before Phaser is removed.
7. **Release gate:** CI, local E2E, deployed smoke, reconnect, spectator, and full-match verification all pass.

## Definition of done

V2 is complete only when the redesigned loop is validated by playtest evidence, the Three.js renderer is the sole production arena renderer, final runtime assets have recorded licenses, 2-4 player matches complete across supported desktop browsers, hidden state remains private, and deployment is verified separately from local tests.
