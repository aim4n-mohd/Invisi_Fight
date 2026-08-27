# V2 gameplay specification

## Round state machine

```text
Lobby
  -> Hunt (15 s)
  -> Commit (3 s)
  -> Resolve (about 1.2 s per shooter)
  -> Recap (1.5 s)
  -> Hunt or Results
  -> Lobby on replay
```

The server owns every transition and timestamp. Clients derive countdowns from server-aligned time and must tolerate a late patch without locally extending a phase.

## Proposed central configuration

All balance values live in `shared/src/config/gameplayConfig.ts` and are imported by both client and server.

| Setting                      | V2 default | Notes                                                         |
| ---------------------------- | ---------: | ------------------------------------------------------------- |
| `huntDurationMs`             |    `15000` | Locked user decision.                                         |
| `commitDurationMs`           |     `3000` | Explicit aim and lock window.                                 |
| `recapDurationMs`            |     `1500` | Short round understanding window.                             |
| `sonarCooldownMs`            |     `3000` | Locked user decision; server enforced.                        |
| `sonarPulseRadiusPx`         |     `1100` | Covers the complete playable arena diagonal.                  |
| `sonarPulseVisualDurationMs` |      `500` | Expanding ring presentation only.                             |
| `sonarSnapshotDurationMs`    |     `2000` | Snapshot remains visible independent of the pulse animation.  |
| `sonarOriginQuantizationPx`  |       `48` | Approximate scanner position disclosed to opponents.          |
| `playerSpeedPxPerSecond`     |      `165` | Reduced from 190; tune after playtest.                        |
| `startingHearts`             |        `2` | Faster, clearer matches.                                      |
| `shotResolutionStepMs`       |     `1200` | One understandable shooter beat.                              |
| `shotAnticipationMs`         |      `300` | Shooter highlight before discharge.                           |
| `shotResultHoldMs`           |      `650` | Holds hit/miss and health response.                           |
| `shotHitRadiusPx`            |       `22` | Forgiving shot target, separate from the 16 px movement body. |

Legacy rotating-sonar settings remain only during migration and are deleted after the new sonar tests and renderer parity pass.

## Hunt

### Available actions

- WASD moves the fighter at the configured speed.
- Mouse movement adjusts provisional aim, but the shot is not committed during Hunt.
- `Space` requests a sonar pulse when cooldown is ready.
- The HUD shows the upcoming firing order, health, sonar readiness, and the Hunt countdown.

### Countdown

- A persistent large countdown occupies the top-center HUD without obscuring the local fighter or aim area.
- It shows whole seconds from 15 to 0 using server-aligned time.
- At 5 seconds it changes to the warning color.
- At 3, 2, and 1 seconds it uses a restrained scale/brightness pulse and an optional short audio tick.
- Color is not the only signal; the numeral, phase label, and progress treatment change together.
- Reduced-motion mode removes scale animation but preserves contrast and timing.

### Manual sonar request

1. The client sends a `trigger_sonar` request with its session/input sequence.
2. The server verifies player identity, alive status, Hunt phase, and `readyAtServerMs`.
3. If accepted, the server samples living non-spectator opponents within the configured pulse radius at that instant.
4. The detector receives one private frozen snapshot per detected opponent, expiring after 2 seconds.
5. Other active players receive a public `sonar_emission` event containing a 48-pixel-grid-quantized origin, server timestamp, and visual radius. They do not receive detected target identities or positions.
6. The detector receives a private acknowledgement containing the exact `readyAtServerMs` used by the cooldown UI.
7. Rejected requests do not reset cooldown and may return a typed private rejection reason for UI recovery, without leaking other players.

Sonar snapshots remain visible for their configured lifetime even after the pulse passes. They stay fixed at the detected position and never follow the target.

### Cooldown feedback

- Ready: sonar icon/ring is high contrast and `Space` is available.
- Cooling down: radial fill and numeric tenths/whole-second transition communicate remaining time.
- Activation: the local pulse expands immediately as predicted presentation, then reconciles to server acknowledgement.
- Rejection or phase change: predicted visual is cancelled without inventing a detection.

## Commit

### Transition

- At Hunt expiry the server freezes movement and starts a 3-second Commit window.
- The local fighter remains visible and mouse aim remains active.
- Sonar cannot be triggered and any cooldown continues on server time without creating a new charge system.
- Existing snapshots may finish their normal lifetime but no new detections are generated.

### Locking a shot

- The provisional aim line is visually distinct from the locked line.
- Primary click sends `lock_shot` with aim angle, sequence, and client timestamp.
- The server validates and stores the latest accepted lock during Commit.
- The client receives a private acknowledgement and changes the fighter/weapon/line to a clearly locked state.
- A later valid click before expiry replaces the previous lock.
- If no explicit lock is accepted, the server locks the latest valid aim at the deadline and records `lockSource: automatic` for private feedback and recap clarity.
- No opponent receives another player's locked aim during Hunt or Commit.

## Resolve

- The server deterministically separates overlaps using the existing rule before public reveal.
- Frozen positions and locked aim become public only when Resolve begins.
- All fighters appear in a subdued frozen treatment.
- The active shooter is highlighted in yellow/amber and identified in the firing-order HUD.
- After about 300 ms of anticipation, the shot resolves using the existing authoritative non-piercing first-ray-hit rule.
- The tracer, muzzle flash, impact/miss endpoint, hit reaction, and heart change are shown before advancing.
- A player eliminated before their firing turn still has that shot cancelled under the existing fairness rule.
- Resolution order still rotates by one living player each round.

## Recap

- The recap lasts about 1.5 seconds.
- It shows a compact event row per resolved shot: shooter, hit/miss/cancelled, target when hit, and resulting hearts.
- The next first shooter is previewed when another round will begin.
- Recap never introduces hidden information beyond what Resolve intentionally revealed.

## Results and replay

- The last living fighter wins.
- Results identify the winner and preserve replay-to-lobby without reload.
- All active-match state, sonar cooldowns, locks, snapshots, and recap events reset before a rematch.

## Spectators and reconnect

- Spectators receive public phase, reveal, resolution, recap, and result information only.
- A reconnecting active player receives the current public state plus their own private position, provisional aim, accepted lock status, sonar cooldown readiness, and still-valid private snapshots where supported.
- Reconnect must not extend phase time or reset a cooldown.

## Onboarding

The first active match uses short contextual prompts rather than a long rules screen:

1. Hunt begins: movement input and local fighter receive a brief visual cue.
2. Sonar ready: the sonar icon and local pulse control are emphasized until first use.
3. Commit begins: provisional aim is emphasized, followed by lock confirmation on click.
4. Resolve teaches through pacing and highlight order, not a blocking overlay.

Prompts must not conceal the countdown or arena. Once an action is successfully performed, its prompt does not repeat in that browser session.

## Post-playtest cover decision

Do not add cover during the first loop redesign. At the fun gate, add cover only if players understand the loop but still report that movement choices feel arbitrary. A cover proposal must separately specify movement collision, shot collision, sonar interaction, spawn safety, map layout, server geometry, privacy implications, and tests.
