# state.md

## Files To Create/Edit

| Path | Why this file is needed |
|---|---|
| `shared/src/config/gameplayConfig.ts` | Centralizes all tunable gameplay constants that affect state transitions, timing, sonar sweep behavior, fade windows, shot pause, update cadence, hearts, and reconnection grace handling. |
| `shared/src/types/match.ts` | Defines the shared TypeScript interfaces for room state, player state, phase state, private snapshots, inputs, round order, and server-emitted events. |
| `shared/src/types/network.ts` | Defines client/server message envelopes, auth/session token payloads, reconnect payloads, and private message contracts used by Colyseus and the UI boundary. |
| `client/src/state/sessionStore.ts` | Holds browser-only session identity, server endpoint, selected name, room code, and reconnect token. |
| `client/src/state/uiStore.ts` | Holds screen-level UI state for landing, lobby, match, spectator, reconnect, and results transitions. |
| `client/src/state/connectionStore.ts` | Tracks connection lifecycle, retry state, wake/reconnect status, and active Colyseus room metadata. |
| `client/src/state/matchViewStore.ts` | Holds client-side derived match view state not owned directly by the server, including interpolation buffers, local camera framing, and transient HUD flags. |
| `client/src/state/privateSnapshotStore.ts` | Stores the local player’s private sonar detections and private aim preview state. |
| `client/src/network/colyseusClient.ts` | Bridges Colyseus room state into client stores, sends inputs, handles private messages, and manages reconnect attempts. |
| `client/src/screens/ConnectingScreen.tsx` | Renders the waking/retrying state while the Render server sleeps or a reconnect is in progress. |
| `client/src/screens/LandingScreen.tsx` | Renders the initial lobby entry form and connection status. |
| `client/src/screens/RoomLobbyScreen.tsx` | Renders the pre-match lobby, player list, and host start control. |
| `client/src/screens/MatchScreen.tsx` | Renders the active match HUD, planning/resolution labels, timer, hearts, firing order, sonar, and local aim line. |
| `client/src/screens/ResultsScreen.tsx` | Renders winner state and replay-to-lobby actions. |
| `server/src/rooms/MatchRoom.ts` | Owns authoritative server state, phase timing, detection, lock-in, firing order, damage resolution, eliminations, reconnection, and room reset behavior. |
| `server/src/rooms/stateUtils.ts` | Contains deterministic helpers for overlap separation, firing order rotation, ray hit detection, and phase transition calculations. |
| `server/src/index.ts` | Boots the server, exposes health and room lifecycle endpoints, and configures Colyseus transport. |
| `client/vite.config.ts` | Configures GitHub Pages base path, environment-specific server endpoint resolution, and asset/public path behavior. |
| `client/src/main.ts` | Wires initial store bootstrapping, endpoint detection, and top-level screen selection. |
| `server/src/index.test.ts` | Verifies server bootstrap, health endpoint behavior, and room lifecycle wiring. |
| `server/src/rooms/MatchRoom.test.ts` | Verifies authoritative room rules, phase transitions, room join behavior, and reconnection behavior. |
| `shared/src/config/gameplayConfig.test.ts` | Verifies centralized gameplay constants remain internally consistent and bounded. |
| `shared/src/types/match.test.ts` | Verifies shared contracts serialize correctly and remain compatible between client and server. |
| `client/src/state/*.test.ts` | Verifies store reset rules, persistence boundaries, and local-only state behavior. |
| `client/e2e/*.spec.ts` | Verifies full lobby-to-match-to-results flow across multiple browsers and reconnect scenarios. |
| `server/e2e/*.spec.ts` | Verifies room behavior through the Colyseus transport with integration-level checks. |

## State Stores

| Name | Shape (TypeScript interface) | Purpose | Scope (global / feature / component) |
|---|---|---|---|
| `SessionStoreState` | ```ts
export interface SessionStoreState {
  playerName: string;
  displayNameValidated: boolean;
  sessionToken: string | null;
  reconnectToken: string | null;
  selectedServerBaseUrl: string;
  preferredRoomCode: string;
  lastJoinedRoomId: string | null;
  accountScope: 'anonymous-room';
}
``` | Browser session identity and connection inputs for anonymous room-based play. Assumption: no account system exists, so identity is limited to name + server-issued session token. | global |
| `UIStoreState` | ```ts
export interface UIStoreState {
  screen: 'landing' | 'connecting' | 'lobby' | 'match' | 'spectator' | 'results';
  modal: 'none' | 'error' | 'reconnect' | 'wake-server';
  connectionBanner: string;
  canSubmitForms: boolean;
  isHost: boolean;
  lastErrorMessage: string | null;
  winnerPlayerId: string | null;
  replayRequested: boolean;
}
``` | Screen-level UI orchestration across landing, lobby, match, reconnect, and results flows. | global |
| `ConnectionStoreState` | ```ts
export interface ConnectionStoreState {
  status: 'idle' | 'connecting' | 'waking' | 'connected' | 'reconnecting' | 'disconnected' | 'failed';
  transport: 'colyseus';
  serverBaseUrl: string;
  roomId: string | null;
  roomCode: string | null;
  sessionId: string | null;
  attemptCount: number;
  nextRetryAtMs: number | null;
  lastConnectedAtMs: number | null;
  lastHeartbeatAtMs: number | null;
  canReconnect: boolean;
}
``` | Tracks multiplayer connection lifecycle, retry state, and active room metadata. | global |
| `MatchViewStoreState` | ```ts
export interface MatchViewStoreState {
  localPlayerId: string | null;
  phase: 'lobby' | 'planning' | 'resolution' | 'results';
  phaseEndsAtServerMs: number | null;
  serverNowMs: number | null;
  timerSecondsRemaining: number;
  upcomingShooterIds: string[];
  activeShooterId: string | null;
  publicPlayers: Array<{
    playerId: string;
    name: string;
    hearts: number;
    eliminated: boolean;
    spectator: boolean;
    isHost: boolean;
    lockedAimAngleRad: number | null;
    lockedAimOrigin: { x: number; y: number } | null;
  }>;
  interpolatedLocalPosition: { x: number; y: number } | null;
  interpolatedLocalVelocity: { x: number; y: number } | null;
  matchWinnerId: string | null;
  roundIndex: number;
}
``` | Client-side derived match view data for rendering smooth movement and public match HUD. | feature |
| `PrivateSnapshotStoreState` | ```ts
export interface PrivateSnapshotStoreState {
  privateAimLine: {
    origin: { x: number; y: number } | null;
    angleRad: number | null;
    locked: boolean;
  };
  sonarSweep: {
    center: { x: number; y: number } | null;
    angleRad: number;
    wedgeWidthRad: number;
    rotationPeriodMs: number;
  };
  detections: Array<{
    detectionId: string;
    targetPlayerId: string;
    detectedAtServerMs: number;
    snapshotPosition: { x: number; y: number };
    fadeEndsAtServerMs: number;
  }>;
}
``` | Holds the local player’s private sonar detections and private aim preview, which must never be sent as public state. | feature |
| `RoomLobbyState` | ```ts
export interface RoomLobbyState {
  roomCode: string;
  playerCount: number;
  minPlayersToStart: number;
  startEnabled: boolean;
  players: Array<{
    playerId: string;
    name: string;
    isHost: boolean;
    connected: boolean;
    spectator: boolean;
  }>;
}
``` | Derived lobby state used to render player list and host start availability. | feature |
| `PhaserSceneState` | ```ts
export interface PhaserSceneState {
  loaded: boolean;
  currentScene: 'boot' | 'menu' | 'lobby' | 'match' | 'spectator' | 'results';
  assetReady: boolean;
  cameraTargetPlayerId: string | null;
  pausedForResolution: boolean;
}
``` | Local Phaser scene lifecycle and rendering coordination. | component |
| `NetworkTelemetryState` | ```ts
export interface NetworkTelemetryState {
  estimatedPingMs: number | null;
  lastStateSyncAtMs: number | null;
  serverTickRateHz: number;
  clientRenderRateHz: number;
  stateSyncBudgetMs: number;
}
``` | Lightweight diagnostic state for update cadence and smooth interpolation. | feature |
| `MatchRuleConstantsState` | ```ts
export interface MatchRuleConstantsState {
  planningDurationMs: number;
  sonarRotationPeriodMs: number;
  sonarWedgeWidthRad: number;
  sonarFadeDurationMs: number;
  resolutionShotPauseMs: number;
  serverUpdateRateHz: number;
  heartsPerPlayer: number;
  reconnectGracePeriodMs: number;
  overlapSeparationDistancePx: number;
}
``` | Read-only mirror of gameplay constants for client rendering and UI timing. | global |

## Async State

### `connectToServer`
Purpose: establish Colyseus connection, including waking a sleeping Render server.

- `idle`
  ```ts
  export interface ConnectToServerIdleState {
    status: 'idle';
    serverBaseUrl: string;
    attemptCount: 0;
    error: null;
    roomId: null;
  }
  ```
- `connecting`
  ```ts
  export interface ConnectToServerConnectingState {
    status: 'connecting';
    serverBaseUrl: string;
    attemptCount: number;
    error: null;
    roomId: null;
  }
  ```
- `waking`
  ```ts
  export interface ConnectToServerWakingState {
    status: 'waking';
    serverBaseUrl: string;
    attemptCount: number;
    error: null;
    roomId: null;
    wakeMessage: 'Waking multiplayer server';
  }
  ```
- `success`
  ```ts
  export interface ConnectToServerSuccessState {
    status: 'success';
    serverBaseUrl: string;
    attemptCount: number;
    error: null;
    roomId: string;
    connectedAtMs: number;
  }
  ```
- `error`
  ```ts
  export interface ConnectToServerErrorState {
    status: 'error';
    serverBaseUrl: string;
    attemptCount: number;
    error: {
      code: 'network_error' | 'server_unavailable' | 'invalid_endpoint' | 'auth_failed';
      message: string;
    };
    roomId: null;
  }
  ```

### `createRoom`
Purpose: create a new authoritative room and receive room code + session token.

- `idle`
  ```ts
  export interface CreateRoomIdleState {
    status: 'idle';
    requestedName: string;
    error: null;
  }
  ```
- `loading`
  ```ts
  export interface CreateRoomLoadingState {
    status: 'loading';
    requestedName: string;
    error: null;
  }
  ```
- `success`
  ```ts
  export interface CreateRoomSuccessState {
    status: 'success';
    requestedName: string;
    roomCode: string;
    roomId: string;
    sessionToken: string;
    reconnectToken: string;
  }
  ```
- `error`
  ```ts
  export interface CreateRoomErrorState {
    status: 'error';
    requestedName: string;
    error: {
      code: 'validation_error' | 'server_error' | 'timeout';
      message: string;
    };
  }
  ```

### `joinRoom`
Purpose: join an existing room by code; join during active match as spectator.

- `idle`
  ```ts
  export interface JoinRoomIdleState {
    status: 'idle';
    roomCode: string;
    error: null;
  }
  ```
- `loading`
  ```ts
  export interface JoinRoomLoadingState {
    status: 'loading';
    roomCode: string;
    error: null;
  }
  ```
- `success`
  ```ts
  export interface JoinRoomSuccessState {
    status: 'success';
    roomCode: string;
    roomId: string;
    spectator: boolean;
    sessionToken: string;
    reconnectToken: string;
  }
  ```
- `error`
  ```ts
  export interface JoinRoomErrorState {
    status: 'error';
    roomCode: string;
    error: {
      code: 'room_not_found' | 'room_full' | 'validation_error' | 'server_error';
      message: string;
    };
  }
  ```

### `startMatch`
Purpose: host-triggered match start from lobby once minimum players are present.

- `idle`
  ```ts
  export interface StartMatchIdleState {
    status: 'idle';
    roomId: string;
    error: null;
  }
  ```
- `loading`
  ```ts
  export interface StartMatchLoadingState {
    status: 'loading';
    roomId: string;
    error: null;
  }
  ```
- `success`
  ```ts
  export interface StartMatchSuccessState {
    status: 'success';
    roomId: string;
    startedAtServerMs: number;
  }
  ```
- `error`
  ```ts
  export interface StartMatchErrorState {
    status: 'error';
    roomId: string;
    error: {
      code: 'not_host' | 'too_few_players' | 'match_in_progress' | 'server_error';
      message: string;
    };
  }
  ```

### `sendPlayerInput`
Purpose: transmit movement and aiming inputs during planning.

- `idle`
  ```ts
  export interface SendPlayerInputIdleState {
    status: 'idle';
    lastSentAtMs: number | null;
    stale: false;
    error: null;
  }
  ```
- `sending`
  ```ts
  export interface SendPlayerInputSendingState {
    status: 'sending';
    lastSentAtMs: number;
    stale: false;
    error: null;
  }
  ```
- `success`
  ```ts
  export interface SendPlayerInputSuccessState {
    status: 'success';
    lastSentAtMs: number;
    stale: false;
    error: null;
  }
  ```
- `stale`
  ```ts
  export interface SendPlayerInputStaleState {
    status: 'success';
    lastSentAtMs: number;
    stale: true;
    staleSinceServerMs: number;
    error: null;
  }
  ```
- `error`
  ```ts
  export interface SendPlayerInputErrorState {
    status: 'error';
    lastSentAtMs: number | null;
    stale: false;
    error: {
      code: 'disconnected' | 'phase_locked' | 'validation_error';
      message: string;
    };
  }
  ```

### `receivePrivateSnapshot`
Purpose: handle private sonar detection snapshots and private aim confirmation.

- `idle`
  ```ts
  export interface ReceivePrivateSnapshotIdleState {
    status: 'idle';
    latestSnapshotAtServerMs: number | null;
    stale: false;
    error: null;
  }
  ```
- `success`
  ```ts
  export interface ReceivePrivateSnapshotSuccessState {
    status: 'success';
    latestSnapshotAtServerMs: number;
    stale: false;
    error: null;
  }
  ```
- `stale`
  ```ts
  export interface ReceivePrivateSnapshotStaleState {
    status: 'success';
    latestSnapshotAtServerMs: number;
    stale: true;
    staleSinceServerMs: number;
    error: null;
  }
  ```
- `error`
  ```ts
  export interface ReceivePrivateSnapshotErrorState {
    status: 'error';
    latestSnapshotAtServerMs: number | null;
    stale: false;
    error: {
      code: 'payload_invalid' | 'session_mismatch';
      message: string;
    };
  }
  ```

### `reconnectToRoom`
Purpose: restore active room presence after refresh, short disconnect, or tab recovery.

- `idle`
  ```ts
  export interface ReconnectToRoomIdleState {
    status: 'idle';
    roomId: string | null;
    error: null;
  }
  ```
- `loading`
  ```ts
  export interface ReconnectToRoomLoadingState {
    status: 'loading';
    roomId: string;
    error: null;
  }
  ```
- `success`
  ```ts
  export interface ReconnectToRoomSuccessState {
    status: 'success';
    roomId: string;
    restoredSpectator: boolean;
    restoredPlayerId: string | null;
  }
  ```
- `error`
  ```ts
  export interface ReconnectToRoomErrorState {
    status: 'error';
    roomId: string | null;
    error: {
      code: 'token_invalid' | 'room_lost' | 'session_expired' | 'server_restart';
      message: string;
    };
  }
  ```

### `replayToLobby`
Purpose: return from results to lobby without page reload.

- `idle`
  ```ts
  export interface ReplayToLobbyIdleState {
    status: 'idle';
    roomId: string;
    error: null;
  }
  ```
- `loading`
  ```ts
  export interface ReplayToLobbyLoadingState {
    status: 'loading';
    roomId: string;
    error: null;
  }
  ```
- `success`
  ```ts
  export interface ReplayToLobbySuccessState {
    status: 'success';
    roomId: string;
    returnedToLobbyAtServerMs: number;
  }
  ```
- `error`
  ```ts
  export interface ReplayToLobbyErrorState {
    status: 'error';
    roomId: string;
    error: {
      code: 'server_error' | 'room_closed';
      message: string;
    };
  }
  ```

## Persistence

| State Key | Store | Persistence Location | Serialization Format | Reason |
|---|---|---|---|---|
| `session.playerName` | `SessionStoreState` | `localStorage` | JSON string | Preserve anonymous display name between refreshes. |
| `session.sessionToken` | `SessionStoreState` | `localStorage` | JSON string | Allows room rejoin after refresh while server is still alive. |
| `session.reconnectToken` | `SessionStoreState` | `localStorage` | JSON string | Supports room reconnection on transient disconnect. |
| `session.selectedServerBaseUrl` | `SessionStoreState` | `localStorage` | JSON string | Remembers development vs production endpoint. |
| `session.preferredRoomCode` | `SessionStoreState` | `localStorage` | JSON string | Improves room-code join friction for repeated play. |
| `connection.serverBaseUrl` | `ConnectionStoreState` | `localStorage` | JSON string | Keeps the selected endpoint stable across reloads. |
| `connection.roomId` | `ConnectionStoreState` | `localStorage` | JSON string | Enables reconnect attempts after refresh. |
| `connection.roomCode` | `ConnectionStoreState` | `localStorage` | JSON string | Helps restore lobby context after refresh. |
| `connection.sessionId` | `ConnectionStoreState` | `localStorage` | JSON string | Needed to pair client state with server-issued identity during reconnect. |
| `ui.lastErrorMessage` | `UIStoreState` | `None` | None | Ephemeral UI feedback should not survive reloads. |
| `ui.modal` | `UIStoreState` | `None` | None | Modal state is transient and should reset on restart. |
| `matchView.interpolatedLocalPosition` | `MatchViewStoreState` | `None` | None | Derived render state should not persist. |
| `matchView.interpolatedLocalVelocity` | `MatchViewStoreState` | `None` | None | Derived render state should not persist. |
| `matchView.upcomingShooterIds` | `MatchViewStoreState` | `None` | None | Server-authoritative order should be re-fetched, not persisted locally. |
| `privateSnapshot.detections` | `PrivateSnapshotStoreState` | `None` | None | Private sonar snapshots are session-local and should expire with the room session. |
| `privateSnapshot.privateAimLine` | `PrivateSnapshotStoreState` | `None` | None | Private aim preview is derived from current input only. |
| `roomLobby.players` | `RoomLobbyState` | `None` | None | Lobby list is authoritative room state and should be re-fetched. |
| `networkTelemetry.*` | `NetworkTelemetryState` | `None` | None | Diagnostics only; should not persist. |
| `matchRules.*` | `MatchRuleConstantsState` | `None` | None | Gameplay constants are compiled/shared, not persisted at runtime. |

## Cache Rules

| Cache Key | TTL | Invalidation Trigger | Stale-While-Revalidate behavior | Max Stale Age |
|---|---:|---|---|---:|
| `room.publicState` | 500 ms | Any Colyseus state patch, phase transition, player join/leave, elimination, or reconnection | Yes; render last known public state while awaiting next patch | 2,000 ms |
| `room.privateSnapshot.localPlayer` | 1,500 ms | New private sonar event, phase transition to resolution, player elimination, reconnect, or match reset | Yes; show last private snapshot and fade it according to captured server timestamps | 3,000 ms |
| `room.playerInputEcho` | 250 ms | New input sent, phase lock, or connection loss | Yes; keep latest echoed local movement/aim for smooth controls until server patch arrives | 1,000 ms |
| `room.timerSync` | 250 ms | Server time sync patch, phase change, or room reconnect | Yes; countdown uses last known server clock while resyncing | 1,000 ms |
| `room.firingOrder` | 1 round | New match start, round rotation, elimination that removes future shooter, or replay-to-lobby reset | Yes; keep upcoming order visible during planning until authoritative update replaces it | 1 round |
| `room.connectionStatus` | 2,000 ms | WebSocket close, heartbeat miss, reconnect attempt, wake success, or explicit disconnect | Yes; maintain banner state and retry indicator while reconnecting | 10,000 ms |

## Reset Rules

| Store / State | Logout | Session Expiry | Account Switch | App Restart | Manual Cache Clear |
|---|---|---|---|---|---|
| `SessionStoreState` | Clear `sessionToken`, `reconnectToken`, `lastJoinedRoomId`; preserve `selectedServerBaseUrl` and `playerName` only if same anonymous browser user remains. | Clear all session fields except `selectedServerBaseUrl`; if expiry occurs mid-room, route to landing with reconnect disabled. | Clear all fields including `playerName` and `preferredRoomCode`; new anonymous identity must be entered. | Restore persisted fields from `localStorage`; if absent, initialize empty name and default endpoint. | Clear `preferredRoomCode`, `lastJoinedRoomId`, `reconnectToken`; keep `selectedServerBaseUrl` and `playerName` unless user explicitly clears name. |
| `UIStoreState` | Reset to landing screen, close modals, clear winner state, disable replay request. | Reset to connecting or landing depending on connectivity; clear error and winner states. | Reset to landing screen and clear all transient UI. | Reset to landing or connecting based on persisted reconnect info. | Reset all transient UI state. |
| `ConnectionStoreState` | Close room, clear room IDs and retry timers, set status to `idle`. | Clear active room metadata, set status to `failed` if server says session invalid, otherwise `disconnected`. | Clear all connection metadata and retry timers. | Initialize from persisted server endpoint; do not assume live room exists. | Clear room metadata and retry state, set status to `idle`. |
| `MatchViewStoreState` | Clear all match view data, including interpolated position, order, and winner. | Clear all match view data because live room context is no longer trusted. | Clear all match view data. | Initialize empty until authoritative state is re-fetched. | Clear all match view data. |
| `PrivateSnapshotStoreState` | Clear detections and private aim line immediately. | Clear detections and private aim line immediately. | Clear detections and private aim line immediately. | Start empty; never restore private snapshots after restart. | Clear detections and private aim line. |
| `RoomLobbyState` | Clear entirely; lobby state is room-scoped only. | Clear entirely. | Clear entirely. | Clear entirely until the room is rejoined. | Clear entirely. |
| `PhaserSceneState` | Return to boot/menu scene. | Return to connecting scene. | Return to boot/menu scene. | Recreate scenes from scratch. | Recreate scene state from scratch. |
| `NetworkTelemetryState` | Clear all telemetry counters. | Clear all telemetry counters. | Clear all telemetry counters. | Reset telemetry counters. | Reset telemetry counters. |

### Explicit exit-path rules
- If the server restarts and the room is lost, treat this as `server_restart` inside `ReconnectToRoomErrorState`, clear all room-scoped stores, and send the user back to landing.
- If the browser refreshes while the room still exists, preserve only `SessionStoreState` and `ConnectionStoreState` persistence keys and attempt reconnection automatically.
- If a user closes the tab, no background recovery is assumed; the next open begins with persisted session inputs only.
- If the room ends naturally and returns to lobby, clear match-only state but preserve name, endpoint, and room code for quick replay.
- If the player manually clears cached data from the app, treat it as a full local reset of room/session/session-token data and keep only the selected server endpoint if the browser storage API returns that value independently.

## Local vs Server Boundary

### Client-Only State
- `UIStoreState`
- `MatchViewStoreState.interpolatedLocalPosition`
- `MatchViewStoreState.interpolatedLocalVelocity`
- `PrivateSnapshotStoreState`
- `NetworkTelemetryState`
- `PhaserSceneState`
- `RoomLobbyState`
- `SendPlayerInput` local pending status
- Client-side wake/retry banners and modal state

### Server-Authoritative State
- Match phase and phase end timestamps
- Player world positions and velocities
- All hearts and elimination status
- Locked aim and firing order
- Sonar sweep timing, sweep angle, and detection eligibility
- Private snapshot emission timing
- Damage resolution and shot cancellation
- Active shooter index during resolution
- Match winner
- Room membership and spectator assignment
- Reconnection validity and session ownership
- Server-side overlap separation and deterministic start-of-resolution normalization

## Cross-Store Dependencies

| Dependency Direction | Trigger | Sync / Reactive |
|---|---|---|
| `ConnectionStoreState -> UIStoreState` | Connection lifecycle changes update the current screen and banner text. | Reactive |
| `SessionStoreState -> ConnectionStoreState` | On app boot, persisted endpoint and reconnect token initialize connection attempts. | Synchronous |
| `SessionStoreState -> UIStoreState` | Landing form changes update connection affordances and validation feedback. | Synchronous |
| `ConnectionStoreState -> MatchViewStoreState` | Colyseus state patches populate player list, phase, timer, and firing order. | Reactive |
| `ConnectionStoreState -> RoomLobbyState` | Lobby patches update player list, host status, and start availability. | Reactive |
| `ConnectionStoreState -> PrivateSnapshotStoreState` | Private messages populate sonar detections and local aim confirmations. | Reactive |
| `PrivateSnapshotStoreState -> MatchViewStoreState` | Private sonar snapshot data feeds local HUD and silhouette display timing. | Reactive |
| `MatchViewStoreState -> UIStoreState` | Phase transitions drive screen switches between lobby, match, spectator, and results. | Reactive |
| `MatchViewStoreState -> PhaserSceneState` | Scene selection follows the authoritative match phase and lifecycle. | Reactive |
| `MatchRuleConstantsState -> MatchViewStoreState` | UI timers, sonar visuals, and labels derive from shared gameplay constants. | Synchronous |
| `MatchRuleConstantsState -> PhaserSceneState` | Rendering cadence and animation timing use shared constants for consistent visuals. | Synchronous |
| `SessionStoreState -> RoomLobbyState` | Preferred room code pre-fills join inputs and lobby context after reload. | Synchronous |
| `ConnectionStoreState -> NetworkTelemetryState` | Heartbeats, retries, and patch timing update telemetry counters. | Reactive |
| `MatchViewStoreState -> SendPlayerInput` | Phase state determines whether input is accepted or marked stale/locked. | Reactive |
| `PrivateSnapshotStoreState -> UIStoreState` | Detection events may briefly surface a local info toast if enabled, but only within the app shell and not as external notifications. | Reactive |
| `ConnectionStoreState -> SessionStoreState` | Successful create/join/reconnect writes session and room identifiers for later recovery. | Synchronous |
| `MatchViewStoreState -> SessionStoreState` | Returning to lobby can preserve room code and room ID for replay continuity. | Synchronous |