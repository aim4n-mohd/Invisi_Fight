## Files To Create/Edit

| Path | Why this file is needed |
|---|---|
| `schema.md` | Canonical data contract for the MVP: database/room state, client storage, JSON payloads, events, enums, indexes, and migration notes. |
| `shared/src/config/gameplayConfig.ts` | Centralized gameplay constants referenced by both client and server for sonar speed, wedge width, planning duration, fade duration, shot pause, update rate, hearts, and room rules. |
| `shared/src/types/match.ts` | Shared TypeScript contracts for Colyseus room state, public/private snapshots, join/auth payloads, input messages, and match event payloads. |
| `server/src/rooms/MatchRoom.ts` | Authoritative room state implementation that persists live match state in-memory for reconnects, phase transitions, firing order, and elimination. |
| `server/src/rooms/MatchRoomState.ts` | Colyseus schema/state model for public room state, player state, and match phase tracking. |
| `server/src/rooms/MatchRoomMessages.ts` | Typed private message contracts for sonar detections, private aim/position sync, reconnect/session acknowledgements, and resolution reveals. |
| `server/src/services/CombatResolver.ts` | Deterministic shot resolution, ray-hit logic, overlap separation, firing-order rotation, and elimination handling. |
| `server/src/services/SonarService.ts` | Deterministic sonar sweep sampling and private detection snapshot generation. |
| `server/src/services/MatchClock.ts` | Server-timestamped planning/resolution timing and phase scheduling. |
| `server/src/index.ts` | Colyseus server bootstrap and environment-based endpoint binding for local and Render deployments. |
| `server/src/config/runtimeEnv.ts` | Runtime configuration parsing for room timing, networking, CORS/origin policy, and deploy-specific settings. |
| `client/src/main.ts` | Vite entrypoint that bootstraps Phaser, connects to the authoritative server, and routes between lobby and match. |
| `client/src/scenes/BootScene.ts` | Phaser bootstrap for loading assets and initializing scene-level configuration. |
| `client/src/scenes/MatchScene.ts` | In-match rendering, interpolation, private aim line, sonar silhouettes, resolution effects, and HUD coordination. |
| `client/src/components/LobbyView.ts` | Landing/lobby DOM UI for name entry, room create/join, player list, host start control, and connection status. |
| `client/src/components/HudView.ts` | HUD DOM UI for timer, hearts, phase label, firing order, active shooter, winner state, and replay-to-lobby flow. |
| `client/src/network/roomClient.ts` | Client networking adapter for room creation/join, reconnection, input sending, private event handling, and state subscription. |
| `client/src/config/clientEnv.ts` | Client-side environment resolution for local WebSocket vs production secure `wss://` endpoint and GitHub Pages base path. |
| `client/public/404.html` | GitHub Pages SPA fallback so direct deep links resolve back to the client app. |
| `client/vite.config.ts` | Vite configuration for GitHub Pages repository subpath, asset base path, and build output. |
| `server/package.json` | Server scripts, test commands, and Render-compatible start entrypoint. |
| `client/package.json` | Client scripts for local dev, build, preview, unit tests, and Playwright runs. |
| `shared/package.json` | Shared package build and test scripts for contracts and constants. |
| `playwright.config.ts` | Multi-browser E2E config for localhost, GitHub Pages preview, and deployed server smoke tests. |
| `vitest.config.ts` | Workspace Vitest config for deterministic logic, server integration, and shared contract tests. |
| `package.json` | Monorepo root scripts for coordinated client/server/shared testing and CI. |
| `.github/workflows/ci.yml` | GitHub Actions pipeline for lint, unit, integration, E2E, and build verification. |
| `render.yaml` | Render deployment config for the authoritative server service. |
| `client/.env.development` | Local client endpoint and GitHub Pages base-path overrides for development. |
| `client/.env.production` | Production client endpoint configuration for the deployed Render server and GitHub Pages subpath. |
| `server/.env.example` | Documented server environment variables for local and Render deployment. |

## Database Schema

### Scope note
This MVP uses an authoritative Colyseus room server with **in-memory live match state** and **no persistent database**. Therefore, there are **no durable relational tables**. The schema below defines the **logical room-state collections** that function as the authoritative runtime data model.  
Assumption: if a future persistence layer is added, it should mirror these shapes without changing gameplay semantics.

### Collection: `MatchRoomState`
Purpose: Root authoritative state for one active room and one current/next match lifecycle.

| Field | Type | Constraints | Description |
|---|---|---|---|
| roomId | `string` | **PK**; non-empty | Unique room code/identifier used for join and reconnect. |
| hostSessionId | `string` | non-empty | Session token of the host player who can start the match. |
| phase | `MatchPhase` | required | Current match phase driven by server timestamps. |
| phaseStartedAtMs | `number` | required; unix ms | Server timestamp when the current phase began. |
| phaseEndsAtMs | `number` | required; unix ms | Server timestamp when the current phase ends. |
| minPlayersToStart | `number` | required | Minimum players required before host can start; MVP value is centrally configurable. |
| planningDurationMs | `number` | required | Length of each planning phase. |
| resolutionShotPauseMs | `number` | required | Delay between sequential shooters during resolution. |
| roundIndex | `number` | required; non-negative integer | Zero-based match round counter. |
| winningPlayerId | `string \| null` | nullable; FK to `PlayerState.playerId` | Winner when match ends. |
| upcomingFireOrder | `string[]` | required; 0..N player IDs | Current round’s planned shooter order shown during planning. |
| activeShooterId | `string \| null` | nullable; FK to `PlayerState.playerId` | Shooter currently resolving; null outside resolution. |
| players | `PlayerState[]` | required | All participants currently in the room, including spectators. |
| sessionVersion | `number` | required; non-negative integer | Monotonic bump for reconnect/session recovery snapshots. |
| serverMode | `ServerMode` | required | Current server operational mode affecting reconnect behavior. |

Relationships:
- `MatchRoomState 1:N PlayerState`
- `MatchRoomState 1:N SonarDetectionSnapshot`
- `MatchRoomState 1:N ShotResolutionRecord`

---

### Collection: `PlayerState`
Purpose: Authoritative per-player state inside a room.

| Field | Type | Constraints | Description |
|---|---|---|---|
| playerId | `string` | **PK**; non-empty | Stable room-local player identifier. |
| sessionId | `string` | **FK**; non-empty | Server-issued session token used for reconnect and private messages. |
| displayName | `string` | required; 1..24 chars | Anonymous display name chosen in the lobby. |
| connectionStatus | `ConnectionStatus` | required | Live connection state for reconnect handling. |
| role | `PlayerRole` | required | Player vs spectator participation mode. |
| isHost | `boolean` | required | True when this player may start the match. |
| isReady | `boolean` | required | Lobby readiness state; MVP may derive from presence but explicit flag is preserved for future flexibility. |
| hearts | `number` | required; integer 0..3 | Remaining health; each player starts with three hearts. |
| eliminatedAtRound | `number \| null` | nullable | Round index when eliminated, or null if still active. |
| x | `number` | required | Authoritative x position in arena space. |
| y | `number` | required | Authoritative y position in arena space. |
| vx | `number` | required | Authoritative x velocity used for interpolation. |
| vy | `number` | required | Authoritative y velocity used for interpolation. |
| aimAngleRad | `number \| null` | nullable | Current live aim angle during planning. |
| lockedAimAngleRad | `number \| null` | nullable | Aim angle committed at planning end; used for resolution. |
| isAimingLocked | `boolean` | required | True after planning ends or after player loses firing opportunity. |
| isAlive | `boolean` | required | False once eliminated. |
| isVisibleToAll | `boolean` | required | True during resolution reveals and for self-visibility. |
| pendingShotIndex | `number \| null` | nullable; integer | Index in firing order for the current round, if any. |

Relationships:
- `PlayerState 1:N SonarDetectionSnapshot` via detecting player as consumer
- `PlayerState 1:N ShotResolutionRecord` via shooter and target references

---

### Collection: `SonarDetectionSnapshot`
Purpose: Private snapshot event emitted only to the detecting player when sonar crosses an opponent.

| Field | Type | Constraints | Description |
|---|---|---|---|
| snapshotId | `string` | **PK**; non-empty | Unique detection event identifier. |
| roomId | `string` | **FK**; non-empty | Owning room. |
| detectingPlayerId | `string` | **FK**; non-empty | Player who is authorized to receive this snapshot. |
| detectedPlayerId | `string` | **FK**; non-empty | Opponent detected by sonar. |
| detectedX | `number` | required | Opponent position at detection time. |
| detectedY | `number` | required | Opponent position at detection time. |
| detectedAtMs | `number` | required; unix ms | Server timestamp when the sweep crossed the opponent. |
| fadeDurationMs | `number` | required | Duration over which the silhouette fades in client rendering. |
| sweepAngleRad | `number` | required | Sonar wedge center angle at detection time. |

Relationships:
- `MatchRoomState 1:N SonarDetectionSnapshot`
- `PlayerState 1:N SonarDetectionSnapshot`

---

### Collection: `ShotResolutionRecord`
Purpose: Authoritative record of each sequential shot during resolution.

| Field | Type | Constraints | Description |
|---|---|---|---|
| shotId | `string` | **PK**; non-empty | Unique shot resolution record. |
| roomId | `string` | **FK**; non-empty | Owning room. |
| roundIndex | `number` | required; integer | Round in which the shot occurred. |
| shooterId | `string` | **FK**; non-empty | Player who fired. |
| targetId | `string \| null` | nullable; FK to `PlayerState.playerId` | First intersected player or null if no hit. |
| shooterAimAngleRad | `number` | required | Locked aim direction used for ray cast. |
| wasCancelled | `boolean` | required | True if shooter lost final heart before firing turn. |
| hitWasFatal | `boolean` | required | True if this shot eliminated the target. |
| resolvedAtMs | `number` | required; unix ms | Server timestamp when the shot resolved. |

Relationships:
- `MatchRoomState 1:N ShotResolutionRecord`
- `PlayerState 1:N ShotResolutionRecord`

---

### Collection: `LobbyJoinRequest`
Purpose: Logical input for room entry and identity binding.

| Field | Type | Constraints | Description |
|---|---|---|---|
| displayName | `string` | required; 1..24 chars | Anonymous name shown in lobby and match UI. |
| roomCode | `string \| null` | nullable | Existing room code to join; null when creating a room. |
| sessionId | `string \| null` | nullable | Existing session token for reconnection. |

---

### Relationships Summary
- `MatchRoomState 1:N PlayerState`
- `MatchRoomState 1:N SonarDetectionSnapshot`
- `MatchRoomState 1:N ShotResolutionRecord`
- `PlayerState 1:N SonarDetectionSnapshot`
- `PlayerState 1:N ShotResolutionRecord`
- `PlayerState 1:N MatchInputMessage` (conceptually via session-bound input stream)
- `LobbyJoinRequest 1:1 RoomJoinResponse`

## Local Storage / AsyncStorage

| Key | Value Type | Purpose | TTL |
|---|---|---|---|
| `invisiFight.displayName` | `string` | Remembers the player’s chosen anonymous display name for faster re-entry. | Until cleared by user or app storage reset. |
| `invisiFight.lastRoomCode` | `string \| null` | Pre-fills the last used room code for convenience on return. | Until cleared by user or app storage reset. |
| `invisiFight.sessionId` | `string \| null` | Stores the server-issued session token for reconnect attempts. | Session-scoped; cleared when room is abandoned or invalidated. |
| `invisiFight.clientSettings` | `ClientSettings` | Stores client preferences that are safe to persist locally. | Until cleared by user or app storage reset. |
| `invisiFight.connectionDiagnostics` | `ConnectionDiagnostics` | Stores recent connection state for waking/retry UX. | 24 hours. |
| `invisiFight.githubPagesBasePath` | `string` | Caches computed base path for GitHub Pages deployment correctness. | Until build/config changes. |

## JSON Contracts

```ts
export type ServerMode = "local" | "production" | "sleeping" | "offline";

export type MatchPhase = "lobby" | "planning" | "resolution" | "match_over";

export type PlayerRole = "player" | "spectator";

export type ConnectionStatus =
  | "connecting"
  | "waking"
  | "reconnecting"
  | "connected"
  | "disconnected";

export interface GameplayConfig {
  readonly minPlayersToStart: number;
  readonly defaultPlayerHearts: 3;
  readonly planningDurationMs: number;
  readonly sonarRotationPeriodMs: number;
  readonly sonarWedgeWidthDeg: number;
  readonly sonarFadeDurationMs: number;
  readonly resolutionShotPauseMs: number;
  readonly serverUpdateRateHz: number;
  readonly maxDisplayNameLength: number;
  readonly roomCodeLength: number;
}

export interface ClientSettings {
  readonly masterVolume: number;
  readonly sfxVolume: number;
  readonly musicVolume: number;
  readonly reduceMotion: boolean;
}

export interface ConnectionDiagnostics {
  readonly lastStatus: ConnectionStatus;
  readonly lastConnectedAtMs: number | null;
  readonly lastErrorMessage: string | null;
}

export interface RoomJoinRequest {
  displayName: string;
  roomCode?: string | null;
  sessionId?: string | null;
}

export interface RoomJoinResponse {
  roomId: string;
  sessionId: string;
  playerId: string;
  isHost: boolean;
  role: PlayerRole;
  serverMode: ServerMode;
  phase: MatchPhase;
}

export interface RoomCreateResponse extends RoomJoinResponse {
  roomCode: string;
}

export interface LobbyPlayerView {
  playerId: string;
  displayName: string;
  hearts: number;
  isHost: boolean;
  role: PlayerRole;
  connectionStatus: ConnectionStatus;
  isReady: boolean;
}

export interface LobbyRoomView {
  roomId: string;
  roomCode: string;
  serverMode: ServerMode;
  phase: MatchPhase;
  hostPlayerId: string;
  players: LobbyPlayerView[];
  minPlayersToStart: number;
  canHostStart: boolean;
}

export interface ClientInputMessage {
  moveX: number;
  moveY: number;
  aimX: number;
  aimY: number;
  isMoving: boolean;
  timestampMs: number;
}

export interface PlayerPublicState {
  playerId: string;
  displayName: string;
  hearts: number;
  isHost: boolean;
  role: PlayerRole;
  isAlive: boolean;
  isVisibleToAll: boolean;
  x: number;
  y: number;
}

export interface PlayerPrivateState {
  playerId: string;
  x: number;
  y: number;
  aimAngleRad: number | null;
  lockedAimAngleRad: number | null;
  sonarSilhouettes: SonarDetectionSnapshotPayload[];
}

export interface SonarDetectionSnapshotPayload {
  snapshotId: string;
  detectedPlayerId: string;
  detectedX: number;
  detectedY: number;
  detectedAtMs: number;
  fadeDurationMs: number;
  sweepAngleRad: number;
}

export interface MatchStatePayload {
  roomId: string;
  phase: MatchPhase;
  phaseStartedAtMs: number;
  phaseEndsAtMs: number;
  roundIndex: number;
  winningPlayerId: string | null;
  upcomingFireOrder: string[];
  activeShooterId: string | null;
  players: PlayerPublicState[];
  serverMode: ServerMode;
}

export interface PlanningSnapshotPayload {
  match: MatchStatePayload;
  privateState: PlayerPrivateState;
}

export interface ResolutionRevealPayload {
  roundIndex: number;
  revealPlayers: PlayerPublicState[];
  firingOrder: string[];
  activeShooterId: string | null;
  shot: ShotResolutionClientPayload | null;
}

export interface ShotResolutionClientPayload {
  shotId: string;
  shooterId: string;
  targetId: string | null;
  shooterAimAngleRad: number;
  wasCancelled: boolean;
  hitWasFatal: boolean;
  resolvedAtMs: number;
}

export interface MatchWinnerPayload {
  roomId: string;
  winningPlayerId: string;
  winningPlayerName: string;
  completedAtMs: number;
}

export interface ReconnectRequest {
  sessionId: string;
  roomId: string;
}

export interface ReconnectResponse {
  accepted: boolean;
  roomId: string;
  sessionId: string;
  reason?: string;
}

export interface ServerRuntimeConfig {
  port: number;
  allowedOrigins: string[];
  updateRateHz: number;
  planningDurationMs: number;
  resolutionShotPauseMs: number;
  sonarRotationPeriodMs: number;
  sonarWedgeWidthDeg: number;
  sonarFadeDurationMs: number;
}

export interface ClientRuntimeConfig {
  apiBaseUrl: string;
  wsEndpoint: string;
  githubPagesBasePath: string;
  useSecureWebSocket: boolean;
}
```

## Events

| Event Name | Payload Type | Producer | Consumer | Trigger |
|---|---|---|---|---|
| `room:created` | `RoomJoinResponse` | Server | Client lobby | Host creates a new room. |
| `room:joined` | `RoomJoinResponse` | Server | Client lobby/match shell | Player joins an existing room or reconnects successfully. |
| `room:join_failed` | `{ reason: string }` | Server | Client lobby | Invalid code, full session rejection policy, or room unavailable. |
| `connection:status_changed` | `{ status: ConnectionStatus; message: string }` | Client networking layer | Lobby/HUD | Endpoint wake/retry/connect state transitions. |
| `player:lobby_updated` | `LobbyRoomView` | Server | Client lobby | Player joins, leaves, reconnects, or changes host status. |
| `match:started` | `MatchStatePayload` | Server | Client match scene/HUD | Host starts match after minimum players are present. |
| `match:phase_changed` | `MatchStatePayload` | Server | Client match scene/HUD | Transition between lobby, planning, resolution, and match_over. |
| `match:planning_tick` | `{ phaseEndsAtMs: number; roundIndex: number }` | Server | Client HUD | Server clock updates during planning. |
| `match:sonar_detection` | `SonarDetectionSnapshotPayload` | Server | Detecting client only | Sonar wedge crosses an opponent during planning. |
| `match:private_state` | `PlayerPrivateState` | Server | Owning client only | Server sends private live position/aim sync. |
| `match:resolution_reveal` | `ResolutionRevealPayload` | Server | All clients | Planning ends and positions/firing order are revealed. |
| `match:shot_resolved` | `ShotResolutionClientPayload` | Server | All clients | Each shooter’s locked shot resolves in sequence. |
| `match:player_eliminated` | `{ playerId: string; eliminatedAtMs: number; heartsRemaining: number }` | Server | All clients | A player loses their final heart. |
| `match:winner_declared` | `MatchWinnerPayload` | Server | All clients | Exactly one survivor remains. |
| `match:return_to_lobby` | `{ roomId: string }` | Server | All clients | Winner screen transitions the room back to lobby for replay. |
| `input:player_state` | `ClientInputMessage` | Client | Server | Player moves or adjusts aim during planning. |
| `input:host_start_match` | `{ roomId: string }` | Host client | Server | Host clicks start in lobby. |
| `input:reconnect` | `ReconnectRequest` | Client | Server | Refresh or temporary disconnect recovery. |

## Enums & Constants

### `ServerMode`
- `local` — Development/server running locally.
- `production` — Deployed Render server and normal live operation.
- `sleeping` — Render Free server is waking from inactivity.
- `offline` — Server unreachable or unavailable.

### `MatchPhase`
- `lobby` — Waiting room before match start or after match reset.
- `planning` — Players move, aim, and receive private sonar detections.
- `resolution` — Locked shots resolve sequentially and reveal information.
- `match_over` — Winner determined; replay-to-lobby flow shown.

### `PlayerRole`
- `player` — Active participant in the current or upcoming match.
- `spectator` — Joined during an active match; watches until next match.

### `ConnectionStatus`
- `connecting` — Initial connection attempt in progress.
- `waking` — Client is retrying because the Render server may be asleep.
- `reconnecting` — Restoring a previous session after refresh/drop.
- `connected` — Active room connection established.
- `disconnected` — Connection lost or could not be established yet.

### `FireOrderRotationMode`
- `random_first_round` — First round order is randomized.
- `rotate_one_forward_each_round` — After each round, the order shifts by one position.

### `HitResolutionMode`
- `first_player_intersection_only` — Shot damages only the first player hit and never pierces.
- `cancel_if_eliminated_before_turn` — Locked shot is skipped if the shooter loses final heart before firing.

### `VisionRule`
- `self_visible_always` — Each player always sees their own character.
- `opponents_hidden_during_planning` — Opponents remain invisible except via private sonar.
- `global_reveal_during_resolution` — All live survivors are revealed during resolution.

### `TimingConstant`
- `planningDurationMs` — Planning phase length in milliseconds.
- `sonarRotationPeriodMs` — Time for one full sonar sweep rotation.
- `sonarWedgeWidthDeg` — Angular width of the sonar wedge.
- `sonarFadeDurationMs` — Fade duration for sonar silhouettes.
- `resolutionShotPauseMs` — Pause between sequential shots.
- `serverUpdateRateHz` — Approximate server sync rate.

### Gameplay constants
```ts
export const GAMEPLAY_CONSTANTS = {
  minPlayersToStart: 2,
  defaultPlayerHearts: 3,
  planningDurationMs: 10000,
  sonarRotationPeriodMs: 2000,
  sonarWedgeWidthDeg: 28,
  sonarFadeDurationMs: 1250,
  resolutionShotPauseMs: 350,
  serverUpdateRateHz: 12,
  maxPlayersTestTarget: 4,
  maxDisplayNameLength: 24,
  roomCodeLength: 6,
} as const;
```

## Indexes

Because the runtime authoritative state is in-memory rather than a persistent database, these are **logical indexes** for efficient room-state lookups and deterministic multiplayer operations.

| Index Name | Table | Fields | Query It Optimizes |
|---|---|---|---|
| `idx_room_state_phase` | `MatchRoomState` | `phase` | Filter active rooms by current phase for admin/debug and server lifecycle checks. |
| `idx_room_state_winner` | `MatchRoomState` | `winningPlayerId` | Fast winner lookup when a match completes. |
| `idx_player_session_id` | `PlayerState` | `sessionId` | Reconnect and private-message routing by session token. |
| `idx_player_role_alive` | `PlayerState` | `role, isAlive` | Identify active players vs spectators for lobby/match logic. |
| `idx_player_host` | `PlayerState` | `isHost` | Resolve host control for start-match permissions. |
| `idx_detection_target` | `SonarDetectionSnapshot` | `detectingPlayerId, detectedAtMs` | Deliver and expire private sonar snapshots in order. |
| `idx_shot_round_order` | `ShotResolutionRecord` | `roomId, roundIndex, resolvedAtMs` | Replay sequential resolution order within a round. |
| `idx_shot_shooter` | `ShotResolutionRecord` | `shooterId` | Audit or debug which player fired each shot. |

## Migration Notes

-

**Versioning strategy:** The MVP uses a single shared contract package with semantic versioning at the monorepo level. Any change to `shared/src/types/match.ts` or `shared/src/config/gameplayConfig.ts` should be treated as a breaking protocol change unless it is strictly additive and optional.
- **Server-state compatibility:** Colyseus room state is ephemeral. If the server restarts, live matches are not migrated; returning players should be sent to the lobby, matching the product brief.
-

**Forward compatibility:** Additive fields should be optional or nullable in all JSON contracts and private events. Existing clients must ignore unknown fields.
-

**Backward compatibility:** Do not rename existing event names, enum values, or required fields without a coordinated client/server release. Use new fields alongside old ones during transitions.
-

**Gameplay constants:** Centralize timing and geometry values in `shared/src/config/gameplayConfig.ts` so unit tests, server logic, and client rendering remain aligned.
-

**Reconnect behavior:** `sessionId` and `roomId` must remain stable for the lifetime of a live room. If a reconnect fails because the room expired or the server restarted, the client should fall back to the lobby with a clear disconnected state.
- **Likely-to-change fields:** `planningDurationMs`, `sonarRotationPeriodMs`, `sonarWedgeWidthDeg`, `sonarFadeDurationMs`, `resolutionShotPauseMs`, and any player-cap-related assumptions are expected to be tuned; keep them configurable and avoid hardcoding in scene logic.
-

**GitHub Pages deployment:** Client configuration should tolerate a repository subpath base URL and secure WebSocket origin changes without requiring code edits, only environment/config updates.