## Files To Create/Edit

| Path | Why this file is needed |
|---|---|
| `auth.md` | Canonical identity and access specification for the MVP, covering anonymous room-based identity, host-only controls, session handling, and security rules. |
| `shared/src/types/match.ts` | Add shared identity/session payloads and room-auth contract types used by both client and server for join, reconnect, forced sign-out, and private messages. |
| `shared/src/config/gameplayConfig.ts` | Store any auth-adjacent runtime constants that affect session expiry, reconnect grace windows, and rate-limit-related client messaging. |
| `server/src/index.ts` | Wire session token issuance/verification middleware, CORS, secure WebSocket settings, and environment-specific auth configuration. |
| `server/src/rooms/MatchRoom.ts` | Enforce room join authorization, host identity binding, reconnect acceptance, spectator handling, and server-side forced sign-out on invalid sessions. |
| `server/src/rooms/MatchRoomState.ts` | Persist the minimal in-memory identity/session fields required to rebind a player after refresh or temporary disconnect. |
| `server/src/services/SessionService.ts` | Issue, verify, rotate, and revoke server session tokens for anonymous room-based identity. |
| `server/src/services/RoomAuthService.ts` | Validate join/create permissions, host assignment, reconnect eligibility, and spectator restrictions. |
| `server/src/services/AuditLogService.ts` | Record security-relevant events: room creation, joins, reconnects, lockouts, forced sign-outs, and room-start authorization checks. |
| `server/src/middleware/rateLimit.ts` | Apply per-IP and per-session request throttling for room create/join/auth endpoints. |
| `server/src/controllers/authController.ts` | Expose the minimal session and room-auth endpoints used before a Colyseus room is joined. |
| `client/src/main.ts` | Initialize client session bootstrap, token restoration, reconnect behavior, and auth-aware app startup. |
| `client/src/stores/sessionStore.ts` | Store the anonymous identity, session token, room code, and reconnect state in browser memory and/or session storage. |
| `client/src/network/roomClient.ts` | Handle authenticated room connection, reconnect, forced sign-out, and unauthorized redirect behavior. |
| `client/src/screens/LobbyScreen.ts` | Render name entry, create/join room actions, host start visibility, and connection/auth error states. |
| `client/src/screens/MatchScreen.ts` | Render participant identity, private/public state boundaries, and spectator view restrictions based on auth state. |
| `client/src/screens/ResultsScreen.ts` | Support match winner display and replay-to-lobby behavior without preserving any long-term identity data. |
| `client/src/components/common/StatusBanner.ts` | Show authentication, reconnect, lockout, and forced sign-out messages consistently. |
| `client/tests/auth/SessionService.test.ts` | Unit tests for token issuance, expiry, rotation, and revocation. |
| `client/tests/auth/RoomAuth.test.ts` | Client-side validation tests for join/start controls and redirect behavior on unauthorized states. |
| `server/tests/auth/RoomAuth.integration.test.ts` | Integration tests covering create/join/reconnect permissions, host-only start, and spectator restrictions. |
| `playwright/auth.spec.ts` | End-to-end verification of anonymous room identity, refresh reconnect, forced sign-out, and waking server flow. |

## Identity Model

Invisi Fight uses **anonymous room-based identity** with a chosen display name plus a server-issued session token. There are no accounts, passwords, emails, phone numbers, passkeys, OAuth identities, or persistent user profiles.

A user identity is composed of:

- **Display name**: user-entered lobby name, required before room creation or joining.
- **Room-scoped player ID**: server-generated identifier unique within a room.
- **Session token**: opaque server-issued token binding the browser to that room-scoped identity.

### Identity rules

- One browser session maps to one active room identity at a time.
- A session token is valid only for the room that issued it.
- A player may reconnect after refresh or temporary disconnect by presenting the same session token.
- If the server is restarted and the in-memory room is lost, the token becomes unusable and the user is returned to the lobby.
- Display names are public inside the room and are synchronized to all participants.
- Display names must be unique within a room after normalization to reduce confusion; if a duplicate is submitted, the server rejects the join and the client prompts for a new name. Assumption: uniqueness is enforced per room, not globally.

### Guest / anonymous handling

- There is no separate guest mode; every participant is anonymous by design.
- The lobby screen is the only entry point and immediately asks for a display name.
- If a browser has a still-valid session token, the client attempts automatic rejoin to the last room before asking the user to re-enter details.
- Spectators are still anonymous room participants; they have no special identity beyond `role = spectator`.

## Roles & Permissions

### Host
**Permissions**
- Create a room.
- Join as a player or host when creating the room.
- Start the match from the lobby once the minimum player count is met.
- See public room state, player list, timer, firing order, and match phase.
- Rejoin as the same host after refresh if the session token remains valid.

**Restrictions**
- Cannot start a match with fewer than 2 active players.
- Cannot assign custom settings, since v1 has no custom room settings.
- Cannot force other players to leave.
- Cannot change another player’s display name.
- Cannot reveal hidden opponent positions outside the server-controlled resolution and private sonar rules.

### Player
**Permissions**
- Join a room using a room code.
- Move, aim, and participate in planning and resolution.
- Receive public room state, private aim/position sync, and private sonar detections for their own client only.
- Reconnect to their existing slot after refresh or temporary disconnect.

**Restrictions**
- Cannot start the match unless they are also the host.
- Cannot view live invisible-opponent positions except through authorized private sonar snapshots.
- Cannot spectate controls or manipulate resolution order.
- Cannot edit match rules or timing constants.

### Spectator
**Permissions**
- Observe public room state, match phase, timer, firing order, and revealed resolution events.
- Remain connected when joining late during an active match.
- Watch the next planning phase if they are still present when the current match ends or if they joined after elimination.

**Restrictions**
- Cannot move or aim in the active match.
- Cannot send gameplay inputs to the authoritative room.
- Cannot receive private sonar detections or private position sync for players.
- Cannot affect match state, resolution, or turn order.
- Cannot start the match.

### Anonymous reconnecting participant
**Permissions**
- Reclaim the previously issued room slot using a valid session token.
- Resume as the same host, player, or spectator role bound to that token.

**Restrictions**
- Cannot assume a different room identity with the same token.
- Cannot recover if the room no longer exists.
- Cannot bypass lockout or rate limits by reconnecting from a new socket alone.

## Auth Flows

### Sign-up
There is no account sign-up flow in v1. Identity is created implicitly when a user creates or joins a room.

1.

**Screen:** `LobbyScreen`
2.

**API call:** `POST /rooms` for create-room or `POST /rooms/:code/join` for join-room
3.

**State change:** Server validates the display name, creates a room-scoped anonymous identity, issues a session token, and the client stores the token and room code for reconnect.

### Sign-in
There is no username/password sign-in flow in v1. “Sign-in” is the act of reconnecting with an existing room session token.

1.

**Screen:** `LobbyScreen` auto-reconnect state, then `ConnectingScreen`/lobby overlay
2.

**API call:** `POST /rooms/:code/reconnect` or Colyseus reconnection handshake with session token
3.

**State change:** Server validates token ownership, restores the prior room slot and role, and resumes state synchronization.

### Password reset
No password reset exists because there are no passwords, emails, or long-term accounts.

1.

**Screen:** None
2.

**API call:** None
3.

**State change:** None

### Email / phone verification
No email or phone verification exists because the product intentionally uses anonymous room identity only.

1.

**Screen:** None
2.

**API call:** None
3.

**State change:** None

### Account deletion
No account deletion exists because the product does not create persistent accounts or profile records.

1.

**Screen:** None
2.

**API call:** None
3.

**State change:** None

### Forced sign-out
Forced sign-out is used when the session token is invalid, the room was lost on server restart, the room has ended, or rate-limit/authorization checks fail.

1.

**Screen:** `MatchScreen`, `LobbyScreen`, or reconnect overlay
2.

**API call:** server emits `session:revoked` private message or rejects reconnect/join/start with `401`-equivalent room auth error
3.

**State change:** Client clears stored session token, clears room code if the room no longer exists, and returns to the lobby with a “session expired / room unavailable” message.

### Room create/join flow
1.

**Screen:** `LobbyScreen`
2.

**API call:** `POST /rooms` or `POST /rooms/:code/join`
3.

**State change:** Server checks name validity, rate limits, room availability, and room identity uniqueness; on success it creates or binds a session token and assigns host or player role.

### Reconnect flow
1.

**Screen:** `LobbyScreen` with “Reconnecting” / “Waking multiplayer server”
2.

**API call:** `POST /rooms/:code/reconnect` then Colyseus room reconnection
3.

**State change:** Server validates the token, restores role and state snapshot, and resumes the previous room connection without creating a new identity.

### Host start flow
1.

**Screen:** `LobbyScreen`
2.

**API call:** `POST /rooms/:code/start`
3.

**State change:** Server checks that requester is the host and at least two active players are present; if valid, match phase changes from lobby to planning.

## Token & Session Lifecycle

### Token types

- **Session token**
  - Type: opaque bearer token generated by the server.
  - Purpose: authorize room create/join/reconnect and bind the browser to a room identity.
  - Storage location: `sessionStorage` for persistence across refresh within the same tab session; mirrored in memory in the client store for runtime use. Assumption: `sessionStorage` is chosen over `localStorage` to reduce long-lived exposure while still surviving refresh during a play session.
  - Expiry: 24 hours or until room end, whichever comes first.
  - Rotation: on successful reconnect and on any server-issued session refresh event, the old token is invalidated and replaced.
  - Revocation: server-side token registry in room memory plus explicit revocation on room end, forced sign-out, invalid auth, or server restart.

- **Room connection cookie**
  - Not used. Assumption: the app uses token-bearing API calls and Colyseus reconnection, not browser cookies, because the client is hosted separately on GitHub Pages and the server on Render.

- **Access token / refresh token**
  - Not used as separate JWTs in v1. Assumption: a single opaque session token is simpler and safer for this room-based MVP.

### Session lifecycle

1. User enters display name and creates or joins a room.
2. Server issues a session token and returns it in the response payload.
3. Client stores the token in `sessionStorage` and in memory.
4. Client uses the token for reconnect attempts, refresh recovery, and authenticated room actions.
5. On refresh, client reads the token and attempts silent rejoin.
6. On successful reconnect, server may rotate the token to limit replay risk.
7. On room end, host leaving, server restart, or invalid session, token is revoked and client state is cleared.

### Revocation mechanism

- In-memory token registry per active room
- Explicit token invalidation when:
  - room ends,
  - player is removed due to invalid identity state,
  - server restarts and room state is lost,
  - rate-limit abuse triggers forced sign-out,
  - reconnect fails due to stale token,
  - host session is no longer authoritative for the room.

### Storage rules

- The token must never be stored in `localStorage`.
- The token must never be embedded in URLs.
- The token must never be sent to other clients.
- The token must only travel over HTTPS/WSS in production and localhost during development.

## Route Guards

| Route/Screen | Required Role/Permission | Redirect If Failed |
|---|---|---|
| `/` `LobbyScreen` | None; unauthenticated anonymous access allowed | N/A |
| `/connecting` `ConnectingScreen` | Valid session token or pending room action | `/` with “connect to a room first” |
| `/room/:code` `LobbyScreen` room state | Valid room session token for that room | `/` with “session expired or room not found” |
| `/room/:code/match` `MatchScreen` | Joined room participant; role `player` or `spectator` | `/room/:code` if joined, otherwise `/` |
| `/room/:code/results` `ResultsScreen` | Room participant with completed match state | `/room/:code` if room still exists, otherwise `/` |
| Host start control in lobby | `host:start` permission | Hide control; if triggered via stale UI, show unauthorized banner and remain on lobby |
| Gameplay input handlers | `player:move`, `player:aim` permission | Ignore input, show spectator/no-control state |
| Reconnect overlay | Valid `session token` and matching room code | `/` and clear stored session token |
| Forced sign-out state | None; terminal state after revocation | `/` after token and room data are cleared |

## Third-Party Auth

No third-party identity providers are used.

### OAuth providers in use
- None

### Exact scopes requested
- None

### Data retrieved
- None

### Storage decisions
- No third-party profile data is stored because the product intentionally avoids external accounts, login providers, and persistent user identity.

## Security Rules

### Rate limiting
Assumption: because the app is a small friends-only prototype, rate limits are conservative but not overly complex.

- `POST /rooms`: 5 attempts per 1 minute per IP
- `POST /rooms/:code/join`: 10 attempts per 1 minute per IP
- `POST /rooms/:code/reconnect`: 12 attempts per 1 minute per IP
- `POST /rooms/:code/start`: 10 attempts per 1 minute per IP and per room
- Invalid session token submissions: 10 attempts per 5 minutes per IP

### Account lockout policy
There are no accounts, so traditional account lockout does not apply. Instead:

- A single room identity is temporarily blocked after repeated invalid reconnect or join attempts.
- After 5 failed auth attempts against the same room/session in 5 minutes, the server rejects new attempts for that session for 15 minutes.
- The browser remains able to return to the lobby, but the specific token is treated as revoked for the lockout duration.

### MFA requirements
No MFA is required or supported. The product uses anonymous room sessions only and is not an account system.

### Audit log events
The server must record the following security-relevant events in structured logs:

- Room created
- Room join accepted
- Room join rejected
- Reconnect accepted
- Reconnect rejected
- Host start accepted
- Host start rejected
- Session token issued
- Session token rotated
- Session token revoked
- Forced sign-out emitted
- Rate limit triggered
- Room lost due to server restart
- Duplicate display name rejected
- Spectator joined active match
- Unauthorized gameplay input ignored

Logs should include timestamp, room code, player role, request source IP when available, and reason code, while avoiding storage of any unnecessary personal data.

## Files To Create/Edit

| Path | Why this file is needed |
|---|---|
| `auth.md` | Primary deliverable documenting the full identity and access model. |
| `shared/src/types/match.ts` | Extend shared contracts with session/auth messages and role enums used by client and server. |
| `server/src/services/SessionService.ts` | Implement opaque token issuance, rotation, validation, and revocation. |
| `server/src/services/RoomAuthService.ts` | Enforce room-scoped identity, host ownership, reconnect authorization, and spectator restrictions. |
| `server/src/controllers/authController.ts` | Provide create/join/reconnect endpoints before Colyseus room attachment. |
| `server/src/middleware/rateLimit.ts` | Apply endpoint throttling and lockout enforcement. |
| `server/src/rooms/MatchRoom.ts` | Bind authenticated identities to room seats and enforce gameplay permissions. |
| `server/src/rooms/MatchRoomState.ts` | Store in-memory session and role data required for reconnect. |
| `server/src/services/AuditLogService.ts` | Emit required audit events for auth and access decisions. |
| `client/src/stores/sessionStore.ts` | Persist session token and room code in `sessionStorage` and memory only. |
| `client/src/network/roomClient.ts` | Attach auth tokens to connection attempts and handle revocation/redirects. |
| `client/src/screens/LobbyScreen.ts` | Provide the initial anonymous entry point and host/join UI. |
| `client/src/screens/MatchScreen.ts` | Apply role-based input gating and spectator-only display states. |
| `client/src/screens/ResultsScreen.ts` | Support safe return to lobby after match completion without retaining identity. |
| `client/src/components/common/StatusBanner.ts` | Surface auth and lockout states to the player. |