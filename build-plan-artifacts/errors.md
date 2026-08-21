# errors.md

## Files To Create/Edit

| Path | Why this file is needed |
|---|---|
| `errors.md` | Canonical error handling, logging, retry, boundary, alerting, and recovery specification for the Invisi Fight MVP. |
| `shared/src/config/gameplayConfig.ts` | Central place for retry windows and reconnect grace timings that affect client-visible error recovery states; keeps timing decisions consistent between client and server. |
| `shared/src/types/match.ts` | Shared error-relevant room state and private message contracts; needed to identify server-emitted error conditions such as room full, match active spectator assignment, and invalid session rebind. |
| `shared/src/types/network.ts` | Shared envelope contracts for error-coded server responses, reconnect payloads, and client-side status events. |
| `client/src/network/colyseusClient.ts` | Client-side handling for connection failures, reconnect attempts, wake/retry logic, and mapping transport/server errors to user-facing messages. |
| `client/src/screens/ConnectingScreen.tsx` | User-visible waking/retrying UI for Render Free sleep, transient disconnects, and retry exhaustion. |
| `client/src/screens/LandingScreen.tsx` | Entry-point validation and connection error display for create/join room actions. |
| `client/src/screens/RoomLobbyScreen.tsx` | Lobby-level handling for host start errors, join-state transitions, and spectator notices. |
| `client/src/screens/MatchScreen.tsx` | In-match error boundary fallback for state sync, render, and private message failures. |
| `client/src/screens/ResultsScreen.tsx` | Replay-to-lobby and match end failure handling. |
| `client/src/components/ErrorBoundary.tsx` | React-style error boundary component for client UI crashes, with controlled fallback UI and logging hooks. |
| `client/src/components/hud/StatusBanner.tsx` | Shared user-facing status/error banner presentation for non-fatal errors. |
| `server/src/index.ts` | Global HTTP/WebSocket error translation, health endpoints, and startup failure logging. |
| `server/src/rooms/MatchRoom.ts` | Authoritative room error generation for invalid joins, room start rejection, reconnect rejection, and match rule violations. |
| `server/src/services/SessionService.ts` | Token/session validation errors and session rotation/revocation failures. |
| `server/src/services/RoomAuthService.ts` | Authorization failures for create/join/start/reconnect flows. |
| `server/src/services/AuditLogService.ts` | Security-relevant logging and redaction enforcement for auth and room lifecycle failures. |
| `server/src/middleware/rateLimit.ts` | Rate-limit error generation and standardized retry-after behavior for abusive or bursty requests. |
| `client/playwright.config.ts` | E2E verification of connection, room lifecycle, reconnect, and error-state rendering. |
| `client/vitest.config.ts` | Unit/integration coverage for deterministic error mapping and recovery logic. |
| `server/vitest.config.ts` | Server-side unit/integration coverage for room errors, validation, and observability hooks. |
| `server/tests/` | Test cases for authoritative error handling, sequencing, and alert-triggering conditions. |
| `client/tests/` | Test cases for UI message correctness, fallbacks, and reconnect UX. |

## Error Taxonomy

| Error Code | Category | Description | Severity | User-Facing |
|---|---|---|---|---|
| ERR_NET_001 | Network/Transport | Cannot reach the multiplayer server during initial connect, create room, join room, or reconnect. Includes sleeping Render Free server, DNS failure, or websocket handshake failure. | high | yes |
| ERR_NET_002 | Network/Transport | Connection dropped during an active session; client must attempt reconnect within the live room window. | high | yes |
| ERR_NET_003 | Network/Transport | Secure WebSocket required in production but the configured endpoint is invalid, mixed-content blocked, or unreachable. | high | yes |
| ERR_NET_004 | Network/Transport | Server wake/retry attempts are still in progress after a temporary sleep or cold start. This is not a hard failure until retries are exhausted. | medium | yes |
| ERR_AUTH_001 | Authentication/Session | Display name is invalid, empty, or violates length/character constraints. Assumption: v1 uses a simple sanitized display name, 1–20 visible characters. | low | yes |
| ERR_AUTH_002 | Authentication/Session | Session token is missing, expired, malformed, or does not match the current room identity. | high | yes |
| ERR_AUTH_003 | Authentication/Session | Reconnect attempted after the room’s reconnect grace window has elapsed or the room is no longer available in memory. | high | yes |
| ERR_AUTH_004 | Authentication/Session | Duplicate room identity or player slot conflict prevents rejoin as the same participant. | medium | yes |
| ERR_ROOM_001 | Room Lifecycle | Requested room code does not exist or is no longer active. | medium | yes |
| ERR_ROOM_002 | Room Lifecycle | Room join rejected because the room is full for the current MVP room state or cannot accept more non-spectator players. Assumption: no hard cap is imposed by design, but the server may reject joins if internal resource limits are hit. | medium | yes |
| ERR_ROOM_003 | Room Lifecycle | Join attempted while a match is active; the user is assigned spectator status until the next match. | low | yes |
| ERR_ROOM_004 | Room Lifecycle | Room cannot start because fewer than two players are present. | low | yes |
| ERR_ROOM_005 | Room Lifecycle | Host-only start action was attempted by a non-host player. | medium | yes |
| ERR_ROOM_006 | Room Lifecycle | Room state is not in a valid phase for the requested action, such as starting twice or replaying while already in lobby. | low | yes |
| ERR_RULE_001 | Gameplay Rules | Input rejected because movement, aim, or firing is attempted in a phase that does not allow it. | low | yes |
| ERR_RULE_002 | Gameplay Rules | Locked shot was cancelled because the player was eliminated before their firing turn. | low | yes |
| ERR_RULE_003 | Gameplay Rules | Private sonar detection could not be applied because the detected opponent is already eliminated, the sweep is stale, or the phase has ended. | low | no |
| ERR_RULE_004 | Gameplay Rules | Deterministic overlap separation failed or produced an invalid state during phase transition. | high | no |
| ERR_RULE_005 | Gameplay Rules | Ray-hit resolution produced an inconsistent target order or non-deterministic result on the authoritative server. | critical | no |
| ERR_RULE_006 | Gameplay Rules | Phase transition timing drifted beyond acceptable server timestamp bounds. | high | no |
| ERR_SYNC_001 | State Synchronization | Client state snapshot is stale or missing required fields after refresh/reconnect. | medium | yes |
| ERR_SYNC_002 | State Synchronization | Private snapshot delivery failed or arrived out of order for the local player. | medium | no |
| ERR_SYNC_003 | State Synchronization | Colyseus room state patch could not be applied cleanly on the client. | medium | yes |
| ERR_SYNC_004 | State Synchronization | Interpolation buffer underflow or invalid correction caused visible jitter or desync. | low | no |
| ERR_UI_001 | UI Rendering | A screen, HUD, or overlay failed to render, but the app can continue in a fallback UI. | medium | yes |
| ERR_UI_002 | UI Rendering | Critical client component crashed inside an error boundary during lobby, match, or results rendering. | high | yes |
| ERR_UI_003 | UI Rendering | Asset loading failed for a required visual or audio element, such as the gunshot sound or HUD sprite. | low | yes |
| ERR_IO_001 | I/O and Assets | Static asset could not be fetched from GitHub Pages or the local Vite dev server. | low | yes |
| ERR_IO_002 | I/O and Assets | Browser storage access failed for session token, selected name, or reconnect metadata. | low | yes |
| ERR_SYS_001 | Server/Runtime | Unhandled server exception in room logic, endpoint handler, or startup sequence. | critical | no |
| ERR_SYS_002 | Server/Runtime | Healthcheck failure or startup crash prevents the server from accepting rooms. | critical | yes |
| ERR_SYS_003 | Server/Runtime | Rate limit exceeded for create/join/reconnect/start requests. | medium | yes |
| ERR_SEC_001 | Security | Invalid or suspicious request pattern indicates tampering, replay, or forged payloads. | high | no |
| ERR_SEC_002 | Security | Attempted access to another player’s private state, sonar snapshot, or hidden position. | high | no |
| ERR_SEC_003 | Security | CORS, origin, or endpoint policy blocked an unsafe browser connection. | medium | yes |

## User-Facing Messages

| Error Code | Message Title | Message Body | Recovery Action Shown |
|---|---|---|---|
| ERR_NET_001 | Can’t connect to the server | The multiplayer server is unavailable right now. If it was asleep, it may take a moment to wake up. | Retry connection |
| ERR_NET_002 | Connection lost | Your connection dropped. We’re trying to reconnect you to the current room now. | Keep retrying |
| ERR_NET_003 | Secure connection required | This version of Invisi Fight needs a secure multiplayer connection. Please open the game from the correct link and try again. | Reload page |
| ERR_NET_004 | Waking multiplayer server | The server is starting up. This can take a short moment after inactivity. | Keep waiting |
| ERR_AUTH_001 | Name not accepted | Please choose a display name with 1 to 20 visible characters. | Edit name |
| ERR_AUTH_002 | Session expired | Your room session is no longer valid. Please rejoin the room from the lobby. | Return to lobby |
| ERR_AUTH_003 | Reconnect window closed | This room is no longer available for reconnection. Please return to the lobby and start a new room. | Return to lobby |
| ERR_AUTH_004 | Couldn’t restore your seat | We couldn’t rejoin you as the same player in this room. Please try joining again. | Join room again |
| ERR_ROOM_001 | Room not found | That room code doesn’t exist or is no longer active. | Join another room |
| ERR_ROOM_002 | Room can’t accept you right now | That room can’t accept another player at the moment. | Try again later |
| ERR_ROOM_003 | Match already in progress | The match has already started. You’ll join as a spectator until the next round. | Continue as spectator |
| ERR_ROOM_004 | Need more players | At least two players are needed before the match can start. | Wait for players |
| ERR_ROOM_005 | Host only | Only the room creator can start the match. | Ask host to start |
| ERR_ROOM_006 | Action not allowed now | That action can’t be used in the current room state. | Go back |
| ERR_RULE_001 | That action isn’t available right now | You can’t do that during this phase. | Keep playing |
| ERR_RULE_002 | Shot cancelled | You were eliminated before your turn, so your shot was cancelled. | Watch the rest of the round |
| ERR_SYNC_001 | Room state is out of date | We couldn’t restore the current room view. Rejoin the room to refresh it. | Rejoin room |
| ERR_SYNC_003 | Room sync was interrupted | The live match state didn’t finish loading correctly. | Reload match |
| ERR_UI_001 | Something on this screen didn’t load | We’re showing a simplified screen so you can keep playing. | Continue |
| ERR_UI_002 | Something went wrong | The game hit a visual problem and returned you to a safe screen. | Reload page |
| ERR_UI_003 | Missing game asset | One of the game files couldn’t load. Reloading may fix it. | Reload page |
| ERR_IO_001 | Couldn’t load game files | A required file didn’t load from the site. | Reload page |
| ERR_IO_002 | Session data unavailable | Your browser couldn’t save or read session data. You may need to rejoin manually. | Rejoin room |
| ERR_SYS_002 | Server unavailable | The multiplayer server is not accepting rooms right now. | Retry later |
| ERR_SYS_003 | Too many attempts | You’ve tried that action too many times in a short period. Please wait a moment and try again. | Wait and retry |
| ERR_SEC_003 | Connection blocked | Your browser blocked the connection to the multiplayer server. | Reload page |

## Logging

### Log levels

- **debug**: low-level lifecycle and deterministic state details used during local development and test runs.
  - Examples: phase timer ticks, sonar sweep angle calculations, firing-order rotation, ray-intersection decisions, reconnect handshake steps, client interpolation corrections, private snapshot dispatch success, room state patch versioning.
- **info**: expected business events and normal room lifecycle changes.
  - Examples: room created, player joined, host started match, phase changed, spectator assigned, private snapshot emitted, player eliminated, match won, player reconnected successfully, server wake succeeded.
- **warn**: recoverable failures and suspicious but not fatal conditions.
  - Examples: retryable network disconnects, stale input rejected, invalid room code, start rejected because fewer than two players, reconnect token nearing expiry, rate-limit hit, asset load fallback, stale snapshot ignored, overlap separation fallback used, non-host start attempt.
- **error**: failures that require attention or indicate broken behavior.
  - Examples: unhandled room exception, authoritative resolution mismatch, failed session validation, repeated reconnect failure, missing required state patch, boundary-crashing render error, startup failure, healthcheck failure, security violation, impossible phase transition.

### Always included context

Every log entry, at every level, must include:

- `timestamp` in ISO 8601 UTC
- `requestId` or `connectionId`
- `userIdHash` derived from the anonymous session identity
- `environment` (`development`, `staging`, or `production`)
- `roomId` when the event is room-scoped
- `phase` when the event is match-scoped
- `playerSlot` when available, using server-issued slot index
- `eventName`
- `errorCode` when the log is error-related

### Redaction rule and PII prohibition

PII must never be logged in raw form. The logging layer must redact or hash any field that could directly identify a person.

Must never be logged:

- full names
- emails
- phone numbers
- passwords
- tokens
- payment data

Specific redaction rules:

- `displayName` must be logged only as a hash or omitted entirely; never write the raw chosen name.
- `sessionToken`, reconnect tokens, and any auth headers must be replaced with `[REDACTED_TOKEN]`.
- `email` fields must be omitted entirely; this app does not use emails in v1.
- `phoneNumber` fields must be omitted entirely; this app does not use phone numbers in v1.
- `paymentMethod`, `cardNumber`, `cvv`, `billingAddress`, and similar payment fields must never be introduced into logs because monetization is out of scope.
- Any freeform error message copied from the browser or server must be sanitized before logging if it could contain names, room codes, or tokens.
- IP addresses should not be logged unless required for security incident response; for this MVP they should be omitted from application logs.

### Logging by subsystem

- **Client**
  - `debug`: connection lifecycle, screen transitions, interpolation, private snapshot receipt, render fallback selection.
  - `info`: room joined, match phase displayed, replay-to-lobby success.
  - `warn`: reconnect attempts, temporary disconnects, stale UI state, recoverable asset load failures.
  - `error`: boundary catches, unrecoverable sync failures, message deserialization failures.
- **Server**
  - `debug`: room state transitions, timing calculations, deterministic algorithms, private event dispatch.
  - `info`: room create/join/start, phase change, elimination, win state, reconnect success.
  - `warn`: invalid inputs, rejected actions, rate limits, spectator assignment, recoverable disconnects.
  - `error`: room crashes, state mismatch, authoritative resolution inconsistencies, startup and health failures.

## Retry Strategy

| Retryable Operation | Max Attempts | Backoff Type | Initial Delay | Max Delay | Retry Condition | Abandon Behavior |
|---|---:|---|---|---|---|---|
| Connect to multiplayer server | 8 | exponential | 500ms | 8s | Network failure, websocket handshake failure, server asleep, DNS timeout, or unreachable endpoint. | Show `ERR_NET_001` or `ERR_NET_004` depending on whether a wake state is still plausible, then offer manual retry or reload. |
| Reconnect to live room | 10 | exponential | 250ms | 5s | Temporary disconnect while the room is still inside reconnect grace window. | Show `ERR_NET_002` if retries exhaust; return to lobby if the server reports the room is gone. |
| Create room | 5 | exponential | 300ms | 3s | Initial create request fails due to transient transport or cold start. | Show `ERR_NET_001` or `ERR_NET_004`; keep the name and endpoint prefilled. |
| Join room by code | 5 | exponential | 300ms | 3s | Initial join request fails due to transient transport or cold start. | Show `ERR_NET_001`, `ERR_ROOM_001`, or `ERR_ROOM_002` depending on server response; preserve entered room code. |
| Start match | 3 | linear | 250ms | 1s | Host start request is rejected by transient room-state synchronization or transport issues, not by rule validation. | Surface `ERR_ROOM_004` or `ERR_ROOM_005` immediately for rule failures; otherwise show a retryable host-start warning. |
| Receive state patch / private snapshot | 3 | linear | 100ms | 500ms | Patch decode failure, temporary out-of-order message, or transient transport issue. | If recovery fails, raise `ERR_SYNC_001` or `ERR_SYNC_003` and reload the room view. |
| Wake Render server by attempting connection | 10 | exponential | 500ms | 10s | First-load connection while host is likely asleep. | Keep showing `ERR_NET_004` until the wake succeeds or attempts are exhausted, then fall back to `ERR_NET_001`. |

## Error Boundaries

### Client boundary placement

1. **AppShellBoundary** — wraps the entire client application shell, including landing, lobby, match, and results screens.
   - Fallback UI: a minimal dark-mode safe screen with the message “Something went wrong” and buttons for Reload Page and Return to Lobby.
   - Reports: `ERR_UI_002`, current screen name, component stack, sanitized browser info, room ID, connection status, and whether the error occurred during connect/join/match/results.
2. **ConnectionScreenBoundary** — wraps `ConnectingScreen` and the network status panel.
   - Fallback UI: “Can’t connect to the server” with a retry button and visible waking/retrying state.
   - Reports: `ERR_NET_001`, `ERR_NET_004`, transport name, endpoint host, retry count, and last successful heartbeat time if present.
3. **LobbyBoundary** — wraps landing and room lobby UI.
   - Fallback UI: simplified lobby with name entry, room code entry, and a single reconnect/reload action.
   - Reports: `ERR_AUTH_001`, `ERR_AUTH_002`, `ERR_ROOM_001`, `ERR_ROOM_002`, `ERR_ROOM_004`, `ERR_ROOM_005`, `ERR_ROOM_006`, UI state snapshot, and sanitized form validity.
4. **MatchHUDBoundary** — wraps the Phaser match scene UI overlays and status HUD.
   - Fallback UI: minimal text-only match panel showing phase, timer, hearts, and current player turn if available.
   - Reports: `ERR_RULE_001`, `ERR_RULE_002`, `ERR_SYNC_001`, `ERR_SYNC_003`, `ERR_UI_001`, `ERR_UI_003`, current phase, round index, local player heart count, and whether private snapshots were active.
5. **ResultsBoundary** — wraps winner display and replay-to-lobby controls.
   - Fallback UI: winner text, a return-to-lobby button, and a brief “Replay unavailable” note if needed.
   - Reports: `ERR_IO_002`, `ERR_SYNC_001`, `ERR_UI_001`, `ERR_UI_002`, match outcome, winner player slot, and whether lobby re-entry succeeded.

### Server-side error boundaries

- **HTTP handler boundary in `server/src/index.ts`**
  - Converts thrown errors into standardized error responses with an `errorCode`, HTTP status, and sanitized human message.
  - Reports: stack trace to server logs only, request metadata, route, status code, and sanitized payload summary.
- **Colyseus room boundary in `server/src/rooms/MatchRoom.ts`**
  - Catches room-level exceptions, logs them, and transitions the room to a safe failed state or closes the room when necessary.
  - Reports: `ERR_SYS_001`, `ERR_RULE_004`, `ERR_RULE_005`, `ERR_RULE_006`, `ERR_SEC_001`, `ERR_SEC_002`, current phase, deterministic seed or round index, and the authoritative action being processed.

## Alerting & Observability

### Observability tooling

- **Client-side**
  - Browser console logs in development only.
  - Vitest for deterministic logic and error mapping.
  - Playwright for end-to-end flows across lobby, connect/wake, match, reconnect, and fallback UIs.
- **Server-side**
  - Structured JSON logs from Node.js and Colyseus.
  - Render service logs for deployment/runtime visibility.
  - GitHub Actions CI logs for test failures and release validation.
  - Manual inspection of Colyseus room state snapshots during local development.
- **Cross-cutting**
  - Shared error code catalog used by both client and server.
  - Correlation by request/connection ID and room ID.
  - Match lifecycle metrics derived from logs only; no external analytics service is required for v1.

### Alert triggers

| Error Code(s) | Alert Condition | Threshold / Window | On-call Escalation Path |
|---|---|---|---|
| ERR_SYS_001, ERR_SYS_002 | Server crash, startup failure, or repeated unhandled exception in room logic | 1 occurrence in 5 minutes, immediate | On-call developer -> repo owner -> manual hotfix/check Render deploy logs |
| ERR_RULE_005, ERR_RULE_006 | Authoritative resolution mismatch or phase timing drift | 3 occurrences in 10 minutes | On-call developer -> gameplay engineer -> pause rollout and inspect deterministic logic |
| ERR_AUTH_002, ERR_AUTH_003 | Session validation or reconnect failures affecting live players | >5 occurrences in 5 minutes | On-call developer -> server engineer -> verify session persistence and room lifetime settings |
| ERR_NET_001, ERR_NET_002, ERR_NET_004 | Connection failures or wake/retry storms | >10 occurrences in 5 minutes or >5 unique rooms impacted in 10 minutes | On-call developer -> infrastructure owner -> inspect Render uptime/sleep behavior and endpoint config |
| ERR_ROOM_005, ERR_ROOM_006 | Host-start authorization or invalid phase action issues | >5 occurrences in 10 minutes | On-call developer -> game logic owner -> review room phase transitions and host binding |
| ERR_SEC_001, ERR_SEC_002, ERR_SEC_003 | Suspicious request, private-data access attempt, or blocked origin pattern | 1 occurrence in 1 minute for critical security events | On-call developer -> security reviewer -> check request source, rate limit, and origin policy |
| ERR_UI_002 | Client crash in app shell or match HUD | >3 occurrences in 15 minutes on the same browser family | On-call developer -> frontend owner -> inspect browser console and boundary reports |

### Alert routing rules

- Critical server faults page the on-call developer immediately through the primary repo-maintainer channel.
- Noncritical but repeated transport issues are grouped into a single incident to avoid noise during Render sleep/wake cycles.
- Security-related events are treated as highest priority regardless of room count.
- Client-only render failures are logged and investigated during the next development cycle unless they correlate with server-side failures.

## Recovery Playbook

### ERR_SYS_002 — Server unavailable
1. Open the Render dashboard and verify the server service status.
2. Check recent deploy logs for startup failures, missing environment variables, or port binding issues.
3. Confirm the health endpoint returns a success response locally and in deployment.
4. If the server is sleeping, trigger a wake by loading the client or issuing a health request.
5. If startup continues to fail, roll back to the last known-good deploy.
6. After recovery, verify that a new room can be created and that a join request succeeds.

### ERR_SYS_001 — Unhandled server exception
1. Retrieve the structured server log entry with the matching request or connection ID.
2. Identify the room phase and action being processed when the exception occurred.
3. Reproduce locally with the same player count and round state using the room integration test harness.
4. Fix the deterministic logic or guard clause that allowed the exception.
5. Redeploy to staging or production after tests pass.
6. Verify that the room can complete a full match without the exception recurring.

### ERR_RULE_005 — Ray-hit resolution produced an inconsistent target order or non-deterministic result
1. Inspect the authoritative shot sequence and the candidate intersection ordering in the server logs.
2. Compare the server’s resolved order with the displayed firing order for the round.
3. Confirm that ray intersection sorting is stable and uses the same canonical tie-breakers on every run.
4. Add or update unit tests for identical geometry cases, equal distances, and overlap edge cases.
5. Re-run multiplayer integration tests with 2–4 players.
6. Redeploy only after deterministic resolution is restored.

### ERR_RULE_006 — Phase transition timing drifted beyond acceptable server timestamp bounds
1. Check room state timestamps for planning start, planning end, and resolution start.
2. Verify the server clock source is consistent and that all phase durations come from shared gameplay constants.
3. Confirm that client-side timers are purely presentational and not used to drive authority.
4. Adjust the phase transition scheduler to use server timestamps only.
5. Run phase-transition unit tests and reconnect tests.
6. Redeploy after confirming planning, freeze, and resolution happen at the correct server times.

### ERR_AUTH_002 — Session expired
1. Confirm whether the player refreshed the page, changed browser storage, or rejoined after the room rotated.
2. Check whether the session token is present and whether the server rejected it as expired or malformed.
3. If the room is still active, offer the player a normal rejoin flow from the lobby.
4. If the token has been revoked or the room was reset, clear the local session data.
5. Ask the player to enter their name again and join or create a new room.
6. Verify the player can join and receive a new server-issued session token.

### ERR_AUTH_003 — Reconnect window closed
1. Check whether the room was lost due to server restart, manual closure, or reconnect grace expiry.
2. Inspect the room lifetime and reconnect grace configuration in shared gameplay constants.
3. Verify that returning players are routed back to the lobby when the live room no longer exists.
4. Clear any stale reconnect token from browser storage.
5. Ask the player to create or join a fresh room.
6. Confirm that reconnect attempts no longer target the closed room.

### ERR_NET_001 / ERR_NET_004 — Cannot connect or server waking
1. Confirm the client endpoint points to the correct development or production WebSocket URL.
2. Verify the Render service is awake and listening.
3. Retry connection automatically until the configured maximum attempts is reached.
4. If the server remains unreachable, open the Render logs and check for deployment or sleep-related issues.
5. If the issue is local only, start the server and client together on localhost and verify the websocket handshake.
6. Once stable, confirm create/join flows work and the waking state resolves automatically.

### ERR_UI_002 — Client crash in app shell or match HUD
1. Open the browser console and capture the component stack reported by the boundary.
2. Identify the exact screen and action that caused the crash.
3. Reproduce in the relevant Playwright scenario or local browser.
4. Patch the component to avoid throwing during render, effect cleanup, or state reconciliation.
5. Add a regression test for the crash path.
6. Verify the safe fallback UI no longer appears during normal gameplay.

### ERR_SEC_001 / ERR_SEC_002 / ERR_SEC_003 — Security or origin issue
1. Confirm the request came from an expected browser origin and endpoint.
2. Verify no private positions, sonar snapshots, or session tokens were present in logs or payloads.
3. Check the rate limiter and room auth service for repeated invalid patterns.
4. Reject the suspicious client state and invalidate the session token if needed.
5. Review CORS and secure WebSocket configuration.
6. Re-test with a normal browser session and ensure only authorized room participants can access private state.