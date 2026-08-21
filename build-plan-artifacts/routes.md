## Files To Create/Edit

| Path | Why this file is needed |
|---|---|
| `routes.md` | Canonical navigation and routing specification for the MVP UI, including lobby, match, spectator, and reconnect flows. |
| `client/src/App.tsx` | Mounts the top-level router and chooses the initial route based on session/room state. |
| `client/src/routes.tsx` | Defines the client route structure, route guards, and modal/overlay navigation behavior described in this document. |
| `client/src/screens/LandingScreen.tsx` | Implements the landing lobby screen where players enter a name and create or join a room. |
| `client/src/screens/RoomLobbyScreen.tsx` | Implements the pre-match lobby with player list, host start control, and connection status. |
| `client/src/screens/MatchScreen.tsx` | Implements the active match HUD, planning/resolution labels, timer, hearts, firing order, and gameplay overlays. |
| `client/src/screens/SpectatorScreen.tsx` | Implements the read-only spectator experience for late joins, eliminated players, and reconnecting users. |
| `client/src/screens/ResultsScreen.tsx` | Implements winner display and replay-to-lobby flow after a match ends. |
| `client/src/screens/ConnectingScreen.tsx` | Implements the waking/connecting state shown while the Render server sleeps or reconnects. |
| `client/src/components/navigation/*` | Shared route-aware shell, back/close controls, and screen-level transition helpers. |
| `shared/src/types/routes.ts` | Shared route and deep-link helper types used by client navigation and tests. |
| `shared/src/config/gameplayConfig.ts` | Centralized gameplay timing values that influence match-screen labels and phase-driven navigation. |
| `server/src/rooms/MatchRoom.ts` | Authoritative room lifecycle that determines when the client should navigate between lobby, match, spectator, and results states. |
| `server/src/services/ReconnectionService.ts` | Exposes reconnect eligibility and active-room recovery states that drive routing decisions after refresh. |
| `client/public/404.html` | GitHub Pages SPA fallback so deep links can land on the correct client route. |

## Screen Inventory

1. | `/` | Landing Screen | Provides the initial lobby entry point for choosing a display name and creating or joining a room.  
2. | `/connecting` | Connecting / Waking Screen | Shows retrying connection status while the client wakes or reconnects to the multiplayer server.  
3. | `/room/:roomCode` | Room Lobby Screen | Displays the room code, player list, connection state, and host start control before the match begins.  
4. | `/room/:roomCode/match` | Match Screen | Shows the live planning/resolution HUD, private local aim state, round timer, hearts, and firing order.  
5. | `/room/:roomCode/spectate` | Spectator Screen | Provides a read-only view for late joiners, eliminated players, and reconnecting participants.  
6. | `/room/:roomCode/results` | Results Screen | Announces the winner and offers a replay-to-lobby action for a new round set.  

## Route Tree

- `App Shell`
  - `Stack Navigator`
    - `/` — Landing Screen
    - `/connecting` — Connecting / Waking Screen
    - `/room/:roomCode` — Room Lobby Screen
      - `Modal Stack`
        - `/room/:roomCode/join-error` — implicit error overlay state handled as modal-style routing if join authorization fails
    - `/room/:roomCode/match` — Match Screen
      - `Modal Stack`
        - `phase overlay` — planning/resolution banner, non-navigable in its own route; state-driven within the screen
    - `/room/:roomCode/spectate` — Spectator Screen
    - `/room/:roomCode/results` — Results Screen

Assumption: the app uses a single top-level stack-like route flow because the product requires one screen focus at a time; modal stacks are used only for transient overlays that do not represent independent screens.

## Dynamic Params

| Route | Param Name | Type | Validation Rule | Example Value |
|---|---|---|---|---|
| `/room/:roomCode` | `roomCode` | string | Must be 4–10 uppercase alphanumeric characters; match the server-issued room code format. | `A7KQ2` |
| `/room/:roomCode/match` | `roomCode` | string | Must be 4–10 uppercase alphanumeric characters; route only resolves if the room exists and the player is authorized. | `A7KQ2` |
| `/room/:roomCode/spectate` | `roomCode` | string | Must be 4–10 uppercase alphanumeric characters; used for late joiners, eliminated users, or reconnect state. | `A7KQ2` |
| `/room/:roomCode/results` | `roomCode` | string | Must be 4–10 uppercase alphanumeric characters; results are only accessible for the active or just-finished room. | `A7KQ2` |

## Route Guards

| Route | Guard Type | Required Condition | Redirect Target If Failed |
|---|---|---|---|
| `/connecting` | feature flag | Server connection is unavailable, sleeping, or reconnecting; route is shown while the client retries. | `/` |
| `/room/:roomCode` | auth | Player has a valid session token for the room or has just created/joined successfully. | `/` |
| `/room/:roomCode/match` | auth | Player is an authorized participant in the room and the room state is in an active match phase. | `/room/:roomCode/spectate` |
| `/room/:roomCode/spectate` | auth | Player is authorized to observe the room as an eliminated player, late joiner, or reconnecting participant. | `/` |
| `/room/:roomCode/results` | auth | Player belongs to the room and a match has concluded or is in post-match result state. | `/room/:roomCode` |
| `/room/:roomCode/join-error` | feature flag | Join was attempted and failed due to room state, invalid code, or server refusal. | `/` |

Assumption: there are no role-based client route gates beyond host-only actions inside the room lobby; host permission is enforced in-room rather than via separate screens.

## Navigation Patterns

| Pattern | When to use it | When not to use it | Screens it applies to |
|---|---|---|---|
| Stack navigation | Use for the primary flow where one full-screen state replaces another: landing, connecting, lobby, match, spectate, and results. | Do not use for transient gameplay HUD changes that do not represent route changes. | `/`, `/connecting`, `/room/:roomCode`, `/room/:roomCode/match`, `/room/:roomCode/spectate`, `/room/:roomCode/results` |
| Modal navigation | Use for brief blocking overlays such as join failures or phase labels when a temporary interruption is required without leaving the screen. | Do not use for core match phases or long-lived states. | `join-error` overlay state; in-match phase overlay state |
| Tab navigation | Not used in v1 because the game is single-focus and does not expose parallel sections. | Use would be confusing for gameplay and is excluded by the product brief. | None |
| Drawer navigation | Not used in v1 because there are no secondary app sections, settings panels, or account areas. | The MVP intentionally excludes settings-heavy or multi-section navigation. | None |

## Deep Links

| Full URL Scheme | Route | Required Params | Optional Params | Fallback If Params Missing |
|---|---|---|---|---|
| `https://<github-pages-host>/<repo-name>/` | `/` | None | None | Stay on landing screen. |
| `https://<github-pages-host>/<repo-name>/connecting` | `/connecting` | None | None | Redirect to `/`. |
| `https://<github-pages-host>/<repo-name>/room/:roomCode` | `/room/:roomCode` | `roomCode` | `displayName` via persisted client session, if available | Redirect to `/connecting` if the room code is absent or invalid. |
| `https://<github-pages-host>/<repo-name>/room/:roomCode/match` | `/room/:roomCode/match` | `roomCode` | None | Redirect to `/room/:roomCode` if match state is not active. |
| `https://<github-pages-host>/<repo-name>/room/:roomCode/spectate` | `/room/:roomCode/spectate` | `roomCode` | None | Redirect to `/room/:roomCode` if the user can re-enter the lobby; otherwise `/`. |
| `https://<github-pages-host>/<repo-name>/room/:roomCode/results` | `/room/:roomCode/results` | `roomCode` | None | Redirect to `/room/:roomCode` if the result state is unavailable. |

Assumption: the GitHub Pages URL is deployed under a repository subpath, so the client router uses the configured Vite `base` path and SPA fallback handling via `404.html`.

## Route Guards

| Route | Guard Type | Required Condition | Redirect Target If Failed |
|---|---|---|---|
| `/` | feature flag | App bootstraps successfully and browser supports required WebSocket/game APIs. | `/connecting` |
| `/connecting` | feature flag | Client has not yet established a stable session or needs to wake the server. | `/` once connected |
| `/room/:roomCode` | auth | Session token matches the room and the user is not in an active match as a participant. | `/connecting` |
| `/room/:roomCode/match` | auth | Session token matches the room and the server marks the player as active participant, not spectator. | `/room/:roomCode/spectate` |
| `/room/:roomCode/spectate` | auth | Session token matches the room and the server marks the client as spectator, eliminated player, or reconnecting member. | `/` |
| `/room/:roomCode/results` | auth | Session token matches the room and the room has a finished match result. | `/room/:roomCode` |

Note: the route guard table is intentionally duplicated above only once in the final document; the earlier table remains the canonical set for the app.

## Transitions

| Navigation Action | Transition Type | Duration |
|---|---|---|
| push | fade-through | 180ms |
| pop | fade-out | 140ms |
| tab switch | none / not used | 0ms |
| modal open | scale-fade-in | 120ms |
| modal close | scale-fade-out | 100ms |
| push from `/` to `/connecting` | full-screen crossfade | 200ms |
| push from `/connecting` to `/room/:roomCode` | full-screen crossfade | 180ms |
| push from `/room/:roomCode` to `/room/:roomCode/match` | hard cut with HUD settle | 0ms |
| push from `/room/:roomCode/match` to `/room/:roomCode/results` | fade-through | 160ms |
| push from `/room/:roomCode/results` to `/room/:roomCode` | fade-through | 160ms |
| modal open during join failure | dimmed overlay + shake | 120ms |
| modal close after acknowledge | fade-out | 100ms |

## Route Tree

- `App Shell`
  - `Stack Navigator`
    - `/` — Landing Screen
    - `/connecting` — Connecting / Waking Screen
    - `/room/:roomCode` — Room Lobby Screen
    - `/room/:roomCode/match` — Match Screen
    - `/room/:roomCode/spectate` — Spectator Screen
    - `/room/:roomCode/results` — Results Screen