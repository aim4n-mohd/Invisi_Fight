# api.md

## Files To Create/Edit

| Path | Why this file is needed |
|---|---|
| `shared/src/config/gameplayConfig.ts` | Central source of truth for all tunable gameplay values used by both client and server, including planning duration, sonar behavior, fade duration, shot pause, update rate, hearts, and reconnect grace windows. |
| `shared/src/types/match.ts` | Shared TypeScript contracts for room auth, join/create payloads, match state, private snapshot messages, input commands, and resolution events. |
| `client/src/network/colyseusClient.ts` | Client networking adapter for joining/creating rooms, reconnecting, sending inputs, and handling private messages. |
| `client/src/screens/ConnectingScreen.tsx` | UI for waking/retrying against a sleeping Render server and for reconnect status. |
| `client/src/screens/LandingScreen.tsx` | Lobby entry point for name entry, create/join actions, and server connection status. |
| `client/src/screens/RoomLobbyScreen.tsx` | Lobby state with room code display, player list, and host start control. |
| `client/src/screens/MatchScreen.tsx` | Active match HUD, planning timer, sonar rendering, firing order, and resolution indicators. |
| `client/src/screens/ResultsScreen.tsx` | Winner display and replay-to-lobby flow. |
| `server/src/index.ts` | Server bootstrap, HTTP endpoints for room lifecycle, Colyseus transport setup, CORS, and environment configuration. |
| `server/src/rooms/MatchRoom.ts` | Authoritative room logic for matchmaking, phase transitions, timing, input handling, reconnection, and private event emission. |
| `server/src/rooms/MatchRoomState.ts` | Colyseus schema/state model for public room state and per-player public state. |
| `server/src/services/RoomAuthService.ts` | Join/create validation, host binding, and session-token verification. |
| `server/src/services/SessionService.ts` | Anonymous session token issuance and validation. |
| `server/src/services/MatchClock.ts` | Server-timestamped phase scheduling and countdown calculations. |
| `server/src/services/SonarService.ts` | Sonar wedge sweep sampling and private detection snapshot generation. |
| `server/src/services/CombatResolver.ts` | Deterministic overlap separation, ray hit resolution, damage, elimination, and firing-order rotation. |
| `server/src/services/AuditLogService.ts` | Minimal security and lifecycle logging for room creation, joins, reconnects, and host-only actions. |
| `server/src/middleware/rateLimit.ts` | Per-IP and per-session request throttling for room create/join/auth endpoints. |
| `client/vite.config.ts` | GitHub Pages base-path configuration and environment-based server endpoint wiring. |
| `client/public/` | Static assets served as-is, including any root-relative hosting files needed for GitHub Pages. |
| `.github/workflows/ci.yml` | CI pipeline for lint, typecheck, unit tests, integration tests, and Playwright checks. |
| `.github/workflows/deploy-client.yml` | GitHub Pages deployment workflow for the Vite client build. |
| `render.yaml` | Render Free service definition for the authoritative server deployment. |
| `package.json` | Workspace scripts for local development, tests, and deployments. |
| `tsconfig.base.json` | Shared TypeScript configuration across client, server, and shared packages. |
| `vitest.workspace.ts` | Shared Vitest project configuration for deterministic game-logic tests and server integration tests. |

## Backend Endpoints

### POST /api/v1/rooms
- **Auth**: None
- **Request Body**:
```ts
type CreateRoomRequest = {
  playerName: string;
  clientSessionId?: string; // optional for returning players; if omitted, server issues a new anonymous session
};
```
- **Response (200)**:
```ts
type CreateRoomResponse = {
  roomId: string;
  roomCode: string;
  sessionToken: string;
  playerId: string;
  hostPlayerId: string;
  wsUrl: string;
  reconnectToken: string;
  createdAtServerMs: number;
};
```
- **Error Responses**:

| Status Code | Error Code | Description |
|---|---|---|
| 400 | INVALID_PLAYER_NAME | Player name is missing, too long, or contains unsupported characters. |
| 401 | SESSION_REJECTED | Provided client session is invalid or expired; server requires a fresh anonymous session. |
| 429 | RATE_LIMITED | Create-room requests exceeded the per-IP or per-session budget. |
| 503 | SERVER_WAKING | Server is booting or waking and cannot create the room yet; client should retry with backoff. |

- **Rate Limit**: 5 req/min per IP, 3 req/min per session
- **Notes**: Creates a new authoritative room in-memory. The creator becomes host only if the room is successfully created. If `clientSessionId` is supplied, the server may reuse identity metadata but still issues a server-signed `sessionToken`.

### POST /api/v1/rooms/join
- **Auth**: None
- **Request Body**:
```ts
type JoinRoomRequest = {
  roomCode: string;
  playerName: string;
  clientSessionId?: string;
};
```
- **Response (200)**:
```ts
type JoinRoomResponse = {
  roomId: string;
  roomCode: string;
  sessionToken: string;
  playerId: string;
  role: "player" | "spectator";
  wsUrl: string;
  reconnectToken: string;
  joinState: "lobby" | "active_match" | "spectator";
  createdAtServerMs: number;
};
```
- **Error Responses**:

| Status Code | Error Code | Description |
|---|---|---|
| 400 | INVALID_ROOM_CODE | Room code is malformed or empty. |
| 400 | INVALID_PLAYER_NAME | Player name is missing, too long, or contains unsupported characters. |
| 404 | ROOM_NOT_FOUND | No room exists for the supplied code. |
| 409 | ROOM_FULL_OR_CLOSED | Room exists but cannot accept another player as an active participant; the joining user may be attached as spectator only if the room is already active. |
| 401 | SESSION_REJECTED | Provided client session is invalid or expired. |
| 429 | RATE_LIMITED | Join-room requests exceeded the budget. |
| 503 | SERVER_WAKING | Server is sleeping or restarting; client should retry until available. |

- **Rate Limit**: 8 req/min per IP, 4 req/min per session
- **Notes**: If the room is in an active match, the joiner is admitted as a spectator and will not affect the current match. If the room is not active and the room can still accept a participant, the joiner enters the lobby as a player.

### POST /api/v1/rooms/:roomId/reconnect
- **Auth**: Required role: player or spectator with valid session token
- **Request Body**:
```ts
type ReconnectRequest = {
  sessionToken: string;
  reconnectToken: string;
  clientLastKnownRevision?: number;
};
```
- **Response (200)**:
```ts
type ReconnectResponse = {
  roomId: string;
  roomCode: string;
  playerId: string;
  role: "player" | "spectator" | "host";
  joinState: "lobby" | "planning" | "resolution" | "results" | "spectator";
  wsUrl: string;
  roomSnapshot: {
    revision: number;
    serverTimeMs: number;
    matchPhase: "lobby" | "planning" | "resolution" | "results";
    publicPlayers: PublicPlayerState[];
    publicFiringOrder: string[];
    publicTimerEndsAtServerMs: number | null;
    publicWinnerPlayerId: string | null;
  };
};
```
- **Error Responses**:

| Status Code | Error Code | Description |
|---|---|---|
| 400 | INVALID_RECONNECT_TOKEN | Reconnect token is malformed or does not match the session. |
| 401 | SESSION_REJECTED | Session token is invalid, expired, or not tied to this room. |
| 404 | ROOM_NOT_FOUND | The in-memory room no longer exists; returning players are redirected to lobby with a fresh room action. |
| 409 | RECONNECT_TOO_LATE | The room exists but the player slot can no longer be restored because the session was superseded. |
| 429 | RATE_LIMITED | Reconnect attempts exceeded the budget. |
| 503 | SERVER_WAKING | Server is unavailable for reconnection. |

- **Rate Limit**: 12 req/min per session
- **Notes**: Used after refresh or temporary disconnect. If the Render server restarted and room state was lost, the client must treat the room as gone and return the user to the landing lobby.

### POST /api/v1/rooms/:roomId/start
- **Auth**: Required role: host
- **Request Body**:
```ts
type StartMatchRequest = {
  sessionToken: string;
};
```
- **Response (200)**:
```ts
type StartMatchResponse = {
  roomId: string;
  matchPhase: "planning";
  roundNumber: number;
  activeShooterPlayerId: string | null;
  planEndsAtServerMs: number;
  firingOrder: string[];
  serverRevision: number;
};
```
- **Error Responses**:

| Status Code | Error Code | Description |
|---|---|---|
| 401 | SESSION_REJECTED | Session token is invalid or the caller is not the host. |
| 403 | FORBIDDEN_NOT_HOST | Caller is authenticated but not the room host. |
| 409 | CANNOT_START_MATCH | Room does not have the minimum required active players or the match is already in progress. |
| 404 | ROOM_NOT_FOUND | Room no longer exists. |
| 429 | RATE_LIMITED | Start requests exceeded the host budget. |
| 503 | SERVER_WAKING | Server unavailable while starting. |

- **Rate Limit**: 4 req/min per room, 2 req/min per host
- **Notes**: Starting is manual and host-only. The server should reject duplicate starts idempotently when already in planning.

### POST /api/v1/rooms/:roomId/leave
- **Auth**: Required role: player or spectator
- **Request Body**:
```ts
type LeaveRoomRequest = {
  sessionToken: string;
};
```
- **Response (200)**:
```ts
type LeaveRoomResponse = {
  roomId: string;
  departedPlayerId: string;
  remainingState: "lobby" | "planning" | "resolution" | "results" | "closed";
  redirectedToLobby: boolean;
};
```
- **Error Responses**:

| Status Code | Error Code | Description |
|---|---|---|
| 401 | SESSION_REJECTED | Session token is invalid. |
| 404 | ROOM_NOT_FOUND | Room no longer exists. |
| 409 | LEAVE_NOT_ALLOWED | The request conflicts with current room state, such as during a locked resolution where the server keeps state until the step completes. |
| 429 | RATE_LIMITED | Leave requests exceeded the budget. |
| 503 | SERVER_WAKING | Server unavailable. |

- **Rate Limit**: 10 req/min per session
- **Notes**: Leaving is best-effort and should not corrupt room state. If the host leaves, host assignment is transferred to the earliest surviving active player when possible; otherwise the room remains in lobby until the match ends.

### GET /api/v1/rooms/:roomId
- **Auth**: Required role: player or spectator in the room
- **Request Body**:
```ts
type GetRoomRequest = never;
```
- **Response (200)**:
```ts
type GetRoomResponse = {
  roomId: string;
  roomCode: string;
  sessionPlayerId: string;
  role: "player" | "spectator" | "host";
  serverTimeMs: number;
  roomState: {
    revision: number;
    matchPhase: "lobby" | "planning" | "resolution" | "results";
    canStart: boolean;
    hostPlayerId: string | null;
    roundNumber: number;
    publicTimerEndsAtServerMs: number | null;
    publicFiringOrder: string[];
    publicPlayers: PublicPlayerState[];
    winnerPlayerId: string | null;
  };
};
```
- **Error Responses**:

| Status Code | Error Code | Description |
|---|---|---|
| 401 | SESSION_REJECTED | Session token is invalid or not authorized for the room. |
| 404 | ROOM_NOT_FOUND | Room no longer exists. |
| 429 | RATE_LIMITED | Polling exceeded the budget. |
| 503 | SERVER_WAKING | Server unavailable. |

- **Rate Limit**: 30 req/min per session
- **Notes**: This is a fallback bootstrap endpoint for refresh recovery and diagnostics; normal gameplay state should come from the Colyseus room transport.

### GET /healthz
- **Auth**: None
- **Request Body**:
```ts
type HealthzRequest = never;
```
- **Response (200)**:
```ts
type HealthzResponse = {
  ok: true;
  service: "invisi-fight-server";
  uptimeMs: number;
  buildSha: string;
};
```
- **Error Responses**:

| Status Code | Error Code | Description |
|---|---|---|
| 503 | UNHEALTHY | Service failed readiness checks. |

- **Rate Limit**: 60 req/min per IP
- **Notes**: Used by Render health checks and client wake/retry diagnostics. This endpoint must remain lightweight and safe to call repeatedly.

## Local Asset Contracts

| Path | Format | Schema (TypeScript type) | Update Frequency |
|---|---|---|---|
| `client/public/favicon.ico` | ICO | `never` | Rarely, only if branding changes. |
| `client/public/og-image.png` | PNG | `never` | Rarely, only if sharing artwork changes. |
| `client/src/assets/audio/gunshot.wav` | WAV | `never` | Rarely; loaded at runtime for shot resolution SFX. |
| `client/src/assets/audio/ui-click.wav` | WAV | `never` | Rarely; loaded at runtime for menu interactions. |
| `client/src/assets/fonts/InterVar.woff2` | WOFF2 | `never` | Rarely; kept static for HUD readability. |
| `client/src/assets/sprites/player.png` | PNG | `never` | Rarely; minimal player visualization. |
| `client/src/assets/sprites/silhouette.png` | PNG | `never` | Rarely; used for fading sonar detections. |
| `client/src/assets/sprites/muzzle-flash.png` | PNG | `never` | Rarely; used during shot resolution. |
| `client/src/assets/sprites/impact.png` | PNG | `never` | Rarely; used on ray-hit. |
| `shared/src/config/gameplayConfig.ts` | TS module | `GameplayConfig` | Changes during balancing and tuning. |
| `artifacts/notes/build-decisions.md` | Markdown | `never` | Per planning iteration; reference only. |

## SDK Callback Contracts

| SDK Name | Callback/Event Name | Payload Type | Handling Rule |
|---|---|---|---|
| Phaser 3 | `scene.create` | `Phaser.Scene` | Initialize renderer, input, and asset loading; do not enter gameplay until room state is synchronized. |
| Phaser 3 | `update` | `{ deltaMs: number }` | Drive interpolation from authoritative server state and render private aim/sonar visuals locally. |
| Phaser 3 | `pointermove` | `{ worldX: number; worldY: number }` | Update only local private aim preview; send throttled aim input to server. |
| Phaser 3 | `keydown-W/A/S/D` | `{ key: string }` | Convert to movement input state and send to the room at the configured network tick rate. |
| Colyseus client SDK | `onStateChange` | `MatchRoomState` | Reconcile authoritative public state and update HUD, lobby, and winner states. |
| Colyseus client SDK | `onMessage("private_sonar")` | `PrivateSonarSnapshot` | Render a fading silhouette only for the detecting player; never share with other clients. |
| Colyseus client SDK | `onMessage("private_aim")` | `PrivateAimSnapshot` | Update the local player's live private line and server-acknowledged aim. |
| Colyseus client SDK | `onMessage("phase_event")` | `PhaseEventPayload` | Transition UI labels and freeze/unfreeze local controls as instructed by the server. |
| Playwright | `page.on("console")` | `ConsoleMessage` | Fail tests on unexpected client errors or network contract regressions. |
| GitHub Actions | `workflow_run` | `WorkflowRunPayload` | Trigger client deployment only after successful main-branch CI. |

## Webhooks

| Direction | Event Type | Payload Type | Verification Method | Retry Policy |
|---|---|---|---|---|
| Outbound | `render.healthcheck` | `HealthzResponse` | HTTPS over Render-managed service endpoint; no signed payload because it is not a webhook callback. | Retry on startup and during wake flows with exponential backoff until server is ready or the user abandons the attempt. |
| Outbound | `github.pages.deploy` | `DeployClientBuildPayload` | GitHub Actions repository-scoped auth token and workflow permissions. | Automatic retry via GitHub Actions job retries; failed deployments block release. |

## Consumed External APIs

| Service | Endpoints Used | Auth Method | What Happens If Unavailable | Rate Limit Budget |
|---|---|---|---|---|
| Colyseus client protocol | WebSocket room transport and private messages | Server-issued `sessionToken` plus room join/reconnect tokens | Client remains on Connecting/Waking state, retries join/reconnect with backoff, and falls back to landing lobby if the room is lost. | Keep update traffic around 10–15 state updates/sec per room; private messages only on actual events. |
| GitHub Pages | Static asset hosting for the Vite client build | Repository deployment credentials via GitHub Actions | The client deployment workflow fails; production client assets are not updated, but gameplay server remains independent. | Deployment frequency governed by CI and manual branch policy. |
| GitHub Actions | CI and deployment workflows | GitHub repository permissions | Build/test/deploy jobs fail visibly; no release artifact is published. | Use standard workflow concurrency to avoid overlapping deploys. |
| Render Free | Server hosting for the authoritative Node/Colyseus process | Render service credentials and environment variables | Client must show connecting/waking state, continue retrying, and allow rejoin if the room is still live after wake. If Render restarts and room memory is lost, players return to lobby via fresh room creation/join. | Respect server cold-start latency; no client-side spam beyond backoff-based retries. |
| Vite | Build and dev server tooling | Local process environment | Client build or dev start fails; tests and deployment cannot proceed until configuration is corrected. | N/A |
| Phaser 3 | Browser rendering and input runtime | None | Match UI cannot render; the app must fail fast in browser console and CI. | Frame-based rendering only; no network budget. |

## Versioning

- **Strategy**: URL versioning using `/api/v1/...` for HTTP endpoints, with Colyseus room schema versioning encoded in shared TypeScript contracts and room state revision numbers.
- **Realtime contract versioning**: `shared/src/types/match.ts` and `shared/src/config/gameplayConfig.ts` are the canonical versioned contracts for client/server compatibility. The client should reject room snapshots whose schema revision is newer than it understands and show a reconnect/refresh-required state.
- **Deprecation policy**: Maintain the current `v1` contract for the MVP without breaking changes during the internal playtest window. If a breaking change is needed, ship it as `/api/v2/...` and keep `v1` running until the client deployment fully transitions. Deprecated endpoints should remain available for at least one release cycle or until all hosted clients are updated, whichever is longer.