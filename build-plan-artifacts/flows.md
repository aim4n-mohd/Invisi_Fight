# flows.md

## Files To Create/Edit

| Path | Why this file is needed |
|---|---|
| `flows.md` | Canonical interaction and state-flow specification for the MVP, covering lobby, matchmaking, gameplay, reconnect, and results behavior. |
| `client/src/routes.tsx` | Needed because every flow below references concrete route names and route guards. |
| `client/src/screens/LandingScreen.tsx` | Needed for the initial name entry, create-room, and join-room flows. |
| `client/src/screens/RoomLobbyScreen.tsx` | Needed for host start, player list, connection status, and pre-match waiting states. |
| `client/src/screens/MatchScreen.tsx` | Needed for the active planning and resolution loop, HUD, sonar detections, and firing-order UI. |
| `client/src/screens/SpectatorScreen.tsx` | Needed for late-join, elimination, and reconnect-as-spectator behavior. |
| `client/src/screens/ResultsScreen.tsx` | Needed for winner announcement and replay-to-lobby flow. |
| `client/src/screens/ConnectingScreen.tsx` | Needed for server sleeping, reconnecting, and session recovery states. |
| `client/src/components/navigation/*` | Needed for route-level shell behavior, transitions, and screen focus management. |
| `client/src/components/landing/*` | Needed for name entry, create/join actions, and connection-state controls on the landing screen. |
| `client/src/components/lobby/*` | Needed for lobby player list, host-only start action, and room code display/copy affordances. |
| `client/src/components/hud/*` | Needed for timer, hearts, match phase labels, firing order, and status panels in match screens. |
| `client/src/components/game/*` | Needed for Phaser canvas embedding, local player rendering, sonar silhouette snapshots, and resolution effects. |
| `server/src/rooms/InvisiFightRoom.ts` | Needed for authoritative room state, phase timing, locking, resolution, and reconnection. |
| `server/src/rooms/handlers/*` | Needed for join/create/start/input/reconnect message handling and validation. |
| `server/src/state/InvisiFightState.ts` | Needed for synchronized room state, player metadata, phase, order, hearts, and spectator status. |
| `shared/src/constants/gameplay.ts` | Needed for centralized balancing values such as planning duration, sonar speed, wedge width, and fade duration. |
| `shared/src/contracts/*` | Needed for client/server message contracts, private snapshot payloads, and typed state synchronization. |
| `shared/src/types/*` | Needed for shared enums and type-safe phase, role, and result definitions. |
| `server/test/*.test.ts` | Needed for deterministic unit/integration coverage of server rules, phase transitions, and room behavior. |
| `client/test/*.spec.ts` | Needed for client-side behavior tests around route transitions, HUD states, and reconnect UI. |
| `e2e/*.spec.ts` | Needed for multi-browser Playwright verification of room creation, match completion, and reconnect flows. |
| `vite.config.ts` | Needed for GitHub Pages subpath support and environment-specific client endpoint configuration. |
| `render.yaml` | Needed for Render deployment of the Colyseus authoritative server. |
| `.github/workflows/ci.yml` | Needed for TDD-friendly CI running unit, integration, and E2E checks. |

---
### Landing / Create Room / Join Room Flow

**Trigger**  
A user opens the app at the `LandingScreen` route in `client/src/routes.tsx` and sees the landing lobby.

**Happy Path**  
1.

**Screen shown:** `LandingScreen` (`client/src/screens/LandingScreen.tsx`);

**Component:** `Input` (`client/src/components/landing/Input`); the user enters a display name;

**System operation:** the client validates the name locally and stores it in session state;

**State change:** the pending identity becomes a valid local player name.
2.

**Screen shown:** `LandingScreen`;

**Component:** `Button` (`client/src/components/landing/Button`); the user chooses **Create Room**;

**System operation:** the client sends a create-room request to the configured Colyseus endpoint;

**State change:** the app enters connecting/room-creation pending state.
3.

**Screen shown:** `ConnectingScreen` (`client/src/screens/ConnectingScreen.tsx`);

**Component:** `Badge` (`client/src/components/navigation/Badge`); the system receives room creation success and session token issuance;

**State change:** the user is authenticated into a newly created room as host.
4.

**Screen shown:** `RoomLobbyScreen` (`client/src/screens/RoomLobbyScreen.tsx`);

**Component:** `Badge` (`client/src/components/lobby/Badge`); the lobby state syncs with room code and player list;

**System operation:** the client subscribes to authoritative room state and private messages;

**State change:** the user is present in the lobby as host and can wait for others.
5.

**Screen shown:** `LandingScreen`;

**Component:** `Input` (`client/src/components/landing/Input`); alternatively the user enters a room code and clicks **Join Room** via `Button` (`client/src/components/landing/Button`);

**System operation:** the client sends a join request with name and room code;

**State change:** the app enters joining pending state.
6.

**Screen shown:** `RoomLobbyScreen`;

**Component:** `Button` (`client/src/components/lobby/Button`); when the join succeeds, the user appears in the room list;

**System operation:** the room state adds the player to the lobby roster;

**State change:** the user is in the lobby as a non-host player.
7.

**Screen shown:** `RoomLobbyScreen`;

**Component:** `Badge` (`client/src/components/lobby/Badge`); once at least two players are present and the host waits, the room remains ready;

**System operation:** the server keeps the room in lobby phase until manually started;

**State change:** the lobby is ready but not yet in match phase.

**Failure Paths**  
-

**Failure condition:** display name is empty or whitespace only.  

**Exact error shown:** `Please enter a display name.`  

**State after failure:** remains on `LandingScreen` with the input preserved.  

**Recovery action available:** edit the name and retry Create Room or Join Room.

-

**Failure condition:** display name exceeds the configured maximum length.  

**Exact error shown:** `Your display name is too long.`  

**State after failure:** remains on `LandingScreen`.  

**Recovery action available:** shorten the name and retry.

-

**Failure condition:** room code is empty on join.  

**Exact error shown:** `Please enter a room code.`  

**State after failure:** remains on `LandingScreen`.  

**Recovery action available:** enter a valid code and retry.

-

**Failure condition:** the server is sleeping, unavailable, or connection cannot be established.  

**Exact error shown:** `Connecting to multiplayer server…`  

**State after failure:** transitions to `ConnectingScreen` and keeps retrying.  

**Recovery action available:** automatic retry until the server wakes or becomes reachable.

-

**Failure condition:** network timeout during create/join.  

**Exact error shown:** `Connection timed out. Retrying…`  

**State after failure:** remains in `ConnectingScreen` with pending session state intact.  

**Recovery action available:** automatic retry; user can keep waiting.

-

**Failure condition:** auth/session token rejected by server.  

**Exact error shown:** `Your session expired. Please join again.`  

**State after failure:** returns to `LandingScreen` with room code cleared and name preserved.  

**Recovery action available:** re-enter room code and join again.

-

**Failure condition:** room code does not exist or has been closed.  

**Exact error shown:** `That room code could not be found.`  

**State after failure:** returns to `LandingScreen`.  

**Recovery action available:** correct the room code or create a new room.

-

**Failure condition:** server returns an internal error while creating or joining a room.  

**Exact error shown:** `We couldn't join that room right now. Please try again.`  

**State after failure:** returns to `LandingScreen`.  

**Recovery action available:** retry create/join.

**Empty State**  
On first launch, `LandingScreen` shows an empty room form with no players, no saved room, and no match context. The user has a name field, a create-room action, and a join-room-code action immediately available. `Badge` components show the current connection status as disconnected until a server request begins.

**Edge Cases**  
- A refresh on the landing screen should preserve a typed display name in session storage for convenience, but never auto-join a room without explicit user action.
- Multiple tabs using the same name are allowed, but each room join request must create a separate room session token.
- If the user submits Create Room twice, the second request must be ignored while the first is pending.
- If the browser restores from suspension during connecting, the client must reconcile against the latest room/session state before allowing another submit.
- If the endpoint is configured for production, all join/create requests must use `wss://`; local development may use `ws://` only when explicitly configured.

---
### Lobby / Host Start / Pre-Match Waiting Flow

**Trigger**  
A player enters `RoomLobbyScreen` after creating or joining a room, or a reconnecting player successfully reattaches to an existing lobby.

**Happy Path**  
1.

**Screen shown:** `RoomLobbyScreen`;

**Component:** `Badge` (`client/src/components/lobby/Badge`); the lobby displays the current connection status and room code;

**System operation:** the client subscribes to authoritative room state from Colyseus;

**State change:** lobby state becomes live and synchronized.
2.

**Screen shown:** `RoomLobbyScreen`;

**Component:** `Input` (`client/src/components/lobby/Input`); players can review their display names in the room roster;

**System operation:** the server syncs lobby membership, host flag, and spectator flags;

**State change:** roster is populated from authoritative state.
3.

**Screen shown:** `RoomLobbyScreen`;

**Component:** `Button` (`client/src/components/lobby/Button`); the host clicks **Start Match** once at least two players are present;

**System operation:** the client sends a start request to the room handler;

**State change:** the room transitions from lobby to planning phase.
4.

**Screen shown:** `RoomLobbyScreen`;

**Component:** `Badge` (`client/src/components/lobby/Badge`); the server rejects or accepts start based on host status and minimum player count;

**System operation:** the room updates match phase and start timestamp;

**State change:** successful start sends all players into the match screen.

**Failure Paths**  
-

**Failure condition:** fewer than two players are present when the host tries to start.  

**Exact error shown:** `At least 2 players are required to start a match.`  

**State after failure:** remains in `RoomLobbyScreen` with lobby unchanged.  

**Recovery action available:** wait for another player and click Start Match again.

-

**Failure condition:** non-host player tries to start the match.  

**Exact error shown:** `Only the room creator can start the match.`  

**State after failure:** remains in `RoomLobbyScreen`.  

**Recovery action available:** the host can start; non-host players wait.

-

**Failure condition:** lobby start request arrives while the room is already transitioning.  

**Exact error shown:** `The match is already starting.`  

**State after failure:** remains in `RoomLobbyScreen` or transitions to match if the start already succeeded elsewhere.  

**Recovery action available:** none required; the client resyncs room state.

-

**Failure condition:** network disconnect while in lobby.  

**Exact error shown:** `Connection lost. Reconnecting…`  

**State after failure:** moves to `ConnectingScreen` with the previous room/session preserved.  

**Recovery action available:** automatic reconnection to the room.

-

**Failure condition:** room state becomes invalid because the server restarted and in-memory match data was lost.  

**Exact error shown:** `The room was reset. Returning to lobby.`  

**State after failure:** returns to `LandingScreen` or a fresh lobby, depending on whether the room code is still valid.  

**Recovery action available:** create or join a new room.

**Empty State**  
Before any joins, `RoomLobbyScreen` shows an empty player list, the room code, and a disabled start control. `Badge` components indicate waiting for players. If the creator is alone, the room remains open and cannot start.

**Edge Cases**  
- Host migration is not supported in v1; if the host disconnects permanently, the room should remain recoverable only when the host reconnects before server reset.
- A joining player arriving during lobby synchronization should be added to the roster once state sync completes, not as a duplicate entry.
- If the host presses Start Match and immediately refreshes, the room should still advance if the server accepted the request.
- Late joiners during lobby are regular players, not spectators, until the match begins.
- The lobby must remain usable after returning from results to support quick rematches without a full page reload.

---
### Planning Phase Gameplay Flow

**Trigger**  
The server enters planning phase after the host starts a match from `RoomLobbyScreen`, or a match is resumed from an active room state after reconnect.

**Happy Path**  
1.

**Screen shown:** `MatchScreen` (`client/src/screens/MatchScreen.tsx`);

**Component:** `Badge` (`client/src/components/hud/Badge`); the planning label becomes active and the 10-second timer begins using server timestamps;

**System operation:** the client receives phase start time, local player identity, hearts, and public roster state;

**State change:** the room is in planning phase.
2.

**Screen shown:** `MatchScreen`;

**Component:** `Input` (`client/src/components/game/Input`); the local player moves with WASD and aims with the mouse;

**System operation:** the client sends movement and aim input deltas to the server at the configured update rate;

**State change:** the authoritative server updates the player’s live position and locked-free aim state.
3.

**Screen shown:** `MatchScreen`;

**Component:** `Badge` (`client/src/components/hud/Badge`); the local player sees their own private aim line and own character;

**System operation:** the client renders the local character, interpolated movement, and current aim vector;

**State change:** local-only visualization remains responsive while hidden opponents stay invisible.
4.

**Screen shown:** `MatchScreen`;

**Component:** `Badge` (`client/src/components/game/Badge`); the player receives private sonar snapshot events as the wedge rotates;

**System operation:** the server detects wedge-opponent intersections and sends silhouette snapshots only to the detecting player;

**State change:** a fading silhouette appears at the detected position for the detecting client only.
5.

**Screen shown:** `MatchScreen`;

**Component:** `Button` (`client/src/components/hud/Button`); as planning progresses, the upcoming firing order is visible in the HUD;

**System operation:** the server broadcasts public order and timer information without revealing hidden positions;

**State change:** the room continues planning until the server timestamp reaches the phase end.
6.

**Screen shown:** `MatchScreen`;

**Component:** `Badge` (`client/src/components/hud/Badge`); when the 10-second timer expires, the client receives the phase transition;

**System operation:** the server freezes movement and aiming and prepares resolution;

**State change:** planning ends and resolution begins.

**Failure Paths**  
-

**Failure condition:** client input is malformed or outside expected ranges.  

**Exact error shown:** `Invalid movement input.`  

**State after failure:** local input is ignored for that frame; match remains in planning.  

**Recovery action available:** continue playing; the next valid input is accepted.

-

**Failure condition:** server rejects movement or aim because the player is not in active planning state.  

**Exact error shown:** `You cannot move right now.`  

**State after failure:** local controls are visually inactive; authoritative state remains unchanged.  

**Recovery action available:** wait for the next planning phase or reconnect if desynced.

-

**Failure condition:** network latency delays a private sonar snapshot.  

**Exact error shown:** `Sonar update delayed.`  

**State after failure:** the silhouette may appear late but still expires using the server-provided timestamp.  

**Recovery action available:** no user action; the client applies the snapshot when received.

-

**Failure condition:** private snapshot payload is rejected due to schema mismatch.  

**Exact error shown:** `Could not process sonar detection.`  

**State after failure:** no silhouette is shown from that event; planning continues.  

**Recovery action available:** automatic resync on the next valid snapshot or state update.

-

**Failure condition:** the server clock or phase timestamp is missing from state sync.  

**Exact error shown:** `Waiting for match timing…`  

**State after failure:** the HUD remains in a loading/indeterminate match state.  

**Recovery action available:** automatic state resync.

-

**Failure condition:** socket disconnect during planning.  

**Exact error shown:** `Connection lost. Reconnecting…`  

**State after failure:** transitions to `ConnectingScreen` while preserving room token.  

**Recovery action available:** auto-reconnect into the same planning phase if the room is still active.

**Empty State**  
The first time a player enters planning, the arena is empty of opponents visually except for their own character and any private silhouettes from sonar. The HUD shows timer, hearts, and a firing-order panel populated from authoritative state. `Badge` components communicate `Planning` as the active phase. `Input` components remain active for movement and aim.

**Edge Cases**  
- A player who refreshes mid-planning should rejoin with the correct live position, hearts, phase timer, and private information only.
- Two sonar detections in quick succession can overlap visually; each snapshot must fade independently using server timestamps.
- The client must not extrapolate opponent positions from sonar silhouettes or from own movement interpolation.
- Players may pass through each other; collision must never reveal hidden opponents or cause physical blocking.
- If the browser tab is backgrounded, the server remains authoritative and the client must catch up on return.

---
### Sonar Detection Snapshot Flow

**Trigger**  
The authoritative server’s rotating sonar wedge crosses an opponent during planning for a specific player.

**Happy Path**  
1.

**Screen shown:** `MatchScreen`;

**Component:** `Badge` (`client/src/components/game/Badge`); the server emits a private detection snapshot to the detecting player only;

**System operation:** the server computes the opponent’s exact detected position and sends a snapshot event with server timestamp;

**State change:** the detecting client stores a new private silhouette snapshot.
2.

**Screen shown:** `MatchScreen`;

**Component:** `Badge` (`client/src/components/game/Badge`); the client renders the silhouette at the detected position and begins fading it over the configured duration;

**System operation:** the client uses the received timestamp to animate fade-out without tracking later movement;

**State change:** a temporary detection artifact appears only for the authorized player.
3.

**Screen shown:** `MatchScreen`;

**Component:** `Badge` (`client/src/components/game/Badge`); when the fade duration elapses, the snapshot is discarded;

**System operation:** the client removes the expired silhouette from local render state;

**State change:** the detecting player no longer sees that silhouette.

**Failure Paths**  
-

**Failure condition:** server attempts to send a detection to the wrong recipient.  

**Exact error shown:** `Could not process sonar detection.`  

**State after failure:** no silhouette is shown to unauthorized clients.  

**Recovery action available:** server retries only for the correct recipient on the next valid detection.

-

**Failure condition:** snapshot payload fails validation.  

**Exact error shown:** `Could not process sonar detection.`  

**State after failure:** snapshot is ignored.  

**Recovery action available:** continue playing; a later valid snapshot may arrive.

-

**Failure condition:** client clock drift makes fade timing inconsistent.  

**Exact error shown:** `Synchronizing detection timing…`  

**State after failure:** silhouette timing is corrected using server timestamp on the next render tick.  

**Recovery action available:** automatic resync.

-

**Failure condition:** network disconnect during a detection animation.  

**Exact error shown:** `Connection lost. Reconnecting…`  

**State after failure:** the client leaves match rendering and reconnects via `ConnectingScreen`.  

**Recovery action available:** automatic reconnection.

**Empty State**  
Before any sonar crossing occurs, the player sees no silhouettes and only their own character, aim line, timer, and HUD information. The detection list is effectively empty.

**Edge Cases**  
- Multiple detections of the same opponent should refresh or stack only according to the latest server timestamp; expired snapshots must be removed independently.
- A silhouette detected just before phase end may still be visible briefly into the transition if its timestamp-based fade has not finished.
- If the same opponent is detected by two different players, each private snapshot is independent and may have different timing.
- Snapshot events must never include live opponent motion after detection; they are positional freezes only.

---
### Planning End and Locked-Aim Freeze Flow

**Trigger**  
The planning timer reaches zero using the authoritative server timestamp.

**Happy Path**  
1.

**Screen shown:** `MatchScreen`;

**Component:** `Badge` (`client/src/components/hud/Badge`); the server announces the planning phase end;

**System operation:** the room state transitions from planning to resolution setup;

**State change:** movement and aiming inputs are no longer accepted.
2.

**Screen shown:** `MatchScreen`;

**Component:** `Badge` (`client/src/components/hud/Badge`); the server freezes all player movement and aim;

**System operation:** the authoritative room locks each living player’s final aim direction and position;

**State change:** each surviving player has a committed shot line.
3.

**Screen shown:** `MatchScreen`;

**Component:** `Badge` (`client/src/components/game/Badge`); if players overlap, the server separates them deterministically;

**System operation:** overlap resolution uses a stable deterministic rule based on room state and player order;

**State change:** players occupy non-overlapping resolution positions.
4.

**Screen shown:** `MatchScreen`;

**Component:** `Button` (`client/src/components/hud/Button`); the public firing order becomes visible with the active shooter highlighted;

**System operation:** the server publishes the upcoming resolution queue and current shooter index;

**State change:** resolution can proceed sequentially.
5.

**Screen shown:** `MatchScreen`;

**Component:** `Badge` (`client/src/components/hud/Badge`); the client transitions to resolution mode;

**System operation:** input handling is disabled and the local HUD switches labels from planning to resolution;

**State change:** committed shots can now be resolved one by one.

**Failure Paths**  
-

**Failure condition:** client tries to keep sending movement or aim after freeze.  

**Exact error shown:** `The planning phase has ended.`  

**State after failure:** local input is ignored and the HUD remains in resolution mode.  

**Recovery action available:** none; wait for resolution or next round.

-

**Failure condition:** server cannot determine a deterministic overlap separation.  

**Exact error shown:** `Unable to finalize player positions.`  

**State after failure:** room remains in a blocked resolution-prep state until a server retry or resync succeeds.  

**Recovery action available:** automatic retry by server logic.

-

**Failure condition:** firing order state is corrupted or missing.  

**Exact error shown:** `Waiting for firing order…`  

**State after failure:** resolution is paused until state is restored.  

**Recovery action available:** server re-emits authoritative room state.

-

**Failure condition:** network disconnect during freeze transition.  

**Exact error shown:** `Connection lost. Reconnecting…`  

**State after failure:** client leaves to `ConnectingScreen`.  

**Recovery action available:** automatic reconnection.

**Empty State**  
Before freeze, the active shooter panel shows the upcoming queue but no one is locked. Once freeze begins, all living players have a committed firing line, and eliminated players are excluded from the queue.

**Edge Cases**  
- A player eliminated in a previous round must not appear in the current round’s firing order.
- If a player loses their final heart exactly as the freeze begins, the server’s authoritative timing determines whether their shot is locked or canceled.
- Overlap separation must be deterministic across clients and refreshes so that shot resolution is reproducible.
- The client must not allow any local aim adjustments after the freeze state has been received, even if pointer movement continues.

---
### Sequential Shot Resolution Flow

**Trigger**  
The server enters resolution mode after planning ends and the firing order is locked.

**Happy Path**  
1.

**Screen shown:** `MatchScreen`;

**Component:** `Badge` (`client/src/components/hud/Badge`); the active shooter is highlighted in the firing-order display;

**System operation:** the server marks the first shooter as active in room state;

**State change:** the resolution queue advances to the first shooter.
2.

**Screen shown:** `MatchScreen`;

**Component:** `Badge` (`client/src/components/game/Badge`); the first shot resolves instantly with muzzle flash, visible shot line, impact effect, and gunshot sound;

**System operation:** the server raycasts the locked line against living players and applies damage to the first intersected target only;

**State change:** one target may lose a heart and possibly be eliminated.
3.

**Screen shown:** `MatchScreen`;

**Component:** `Badge` (`client/src/components/hud/Badge`); the shot pause between shooters completes;

**System operation:** the server advances to the next living shooter after the configured short delay;

**State change:** the next shooter becomes active.
4.

**Screen shown:** `MatchScreen`;

**Component:** `Button` (`client/src/components/hud/Button`); the client updates the displayed order and active shooter indicator;

**System operation:** the client reflects the server’s sequential result updates and any eliminations;

**State change:** the queue shortens as shots are consumed.
5.

**Screen shown:** `MatchScreen`;

**Component:** `Badge` (`client/src/components/hud/Badge`); once the final shot resolves, the server evaluates survivors;

**System operation:** the match either continues to a new round or ends with a winner;

**State change:** resolution completes.

**Failure Paths**  
-

**Failure condition:** a shot ray misses all players.  

**Exact error shown:** `Shot missed.`  

**State after failure:** no hearts change; the queue advances.  

**Recovery action available:** none needed; the next shooter proceeds.

-

**Failure condition:** a shot intersects a player who has already been eliminated before their turn.  

**Exact error shown:** `Shot canceled because the shooter was eliminated.`  

**State after failure:** the shooter’s locked shot is skipped; the resolution queue advances.  

**Recovery action available:** none needed; the server continues with the next living shooter.

-

**Failure condition:** a hit packet is malformed or conflicts with room state.  

**Exact error shown:** `Could not resolve that shot.`  

**State after failure:** the server re-evaluates from authoritative state and may re-emit resolution.  

**Recovery action available:** automatic resync; the client waits.

-

**Failure condition:** network disconnect during resolution animation.  

**Exact error shown:** `Connection lost. Reconnecting…`  

**State after failure:** the client moves to `ConnectingScreen`.  

**Recovery action available:** reconnect and resume from the authoritative room state.

-

**Failure condition:** audio asset fails to play for gunshot sound.  

**Exact error shown:** `Audio could not be played.`  

**State after failure:** visual resolution still completes; audio is skipped.  

**Recovery action available:** continue playing; no blocking recovery required.

**Empty State**  
At the start of resolution, the firing-order panel is populated, the active shooter is highlighted, and living players are visible to all clients. Before the first shot, no impact effects are present and the arena is frozen.

**Edge Cases**  
- If a shooter is eliminated by an earlier shot in the same resolution phase, their locked shot must be canceled even if their turn has not yet arrived.
- The first intersected player along the ray must take damage only once per shot; the shot cannot pierce.
- The server must resolve shots in the same order shown in the HUD to avoid perceived unfairness.
- A player who disconnects during resolution remains subject to the authoritative shot sequence if their session is still part of the room state.

---
### Elimination / Spectator Transition Flow

**Trigger**  
A player’s hearts reach zero as a result of shot resolution, or a player joins after a match has already started.

**Happy Path**  
1.

**Screen shown:** `MatchScreen` or `SpectatorScreen` (`client/src/screens/SpectatorScreen.tsx`);

**Component:** `Badge` (`client/src/components/hud/Badge`); the server marks the player eliminated and removes them from active play;

**System operation:** the authoritative state changes the player role from active to spectator;

**State change:** the eliminated player no longer participates in future planning phases.
2.

**Screen shown:** `SpectatorScreen`;

**Component:** `Badge` (`client/src/components/navigation/Badge`); the eliminated player sees a read-only spectator experience for the rest of the match;

**System operation:** the client switches routes based on the updated room role;

**State change:** controls are disabled and only status information remains.
3.

**Screen shown:** `MatchScreen`;

**Component:** `Badge` (`client/src/components/hud/Badge`); surviving players continue with the next round or the final win state;

**System operation:** the server excludes eliminated players from future firing orders and sonar/aim updates;

**State change:** active roster is reduced.
4.

**Screen shown:** `SpectatorScreen`;

**Component:** `Button` (`client/src/components/navigation/Button`); a late joiner during an active match is assigned spectator status immediately;

**System operation:** the server creates a session tied to read-only room state;

**State change:** the late joiner can watch but not participate until the next match.

**Failure Paths**  
-

**Failure condition:** elimination event arrives late or out of order.  

**Exact error shown:** `Synchronizing elimination state…`  

**State after failure:** the client waits for authoritative room state and then switches to spectator or active mode correctly.  

**Recovery action available:** automatic resync.

-

**Failure condition:** the client attempts to send gameplay input after elimination.  

**Exact error shown:** `You are spectating this match.`  

**State after failure:** input is ignored.  

**Recovery action available:** none; the user can only watch until the match ends.

-

**Failure condition:** late join request occurs after match start and room cannot assign spectator state.  

**Exact error shown:** `This match is already in progress.`  

**State after failure:** the late joiner is placed into spectator mode if room state is available, otherwise returned to landing with error.  

**Recovery action available:** retry reconnect or join a new room.

-

**Failure condition:** room state lost after server restart while players were eliminated.  

**Exact error shown:** `The room was reset. Returning to lobby.`  

**State after failure:** clients return to the lobby or landing state.  

**Recovery action available:** create or join a new room.

**Empty State**  
No one is eliminated at match start. The spectator screen is empty until the first elimination or late join occurs.

**Edge Cases**  
- If a player is eliminated at the same time the match ends, winner determination must take precedence over a spectator transition flicker.
- Spectators must never regain movement or aim controls in the same match.
- A reconnecting eliminated player should rejoin as spectator, not as an active player, even if they still have a valid session token.
- Late joins during active match should be prevented from receiving live hidden positions except what is public during resolution.

---
### Match End / Winner / Replay to Lobby Flow

**Trigger**  
The authoritative server determines that only one surviving player remains, or no active players remain and a winner can be declared according to room rules.

**Happy Path**  
1.

**Screen shown:** `MatchScreen`;

**Component:** `Badge` (`client/src/components/hud/Badge`); the server announces the match winner;

**System operation:** the room state transitions to match-end/results state;

**State change:** gameplay input is disabled and the winner is locked in.
2.

**Screen shown:** `ResultsScreen` (`client/src/screens/ResultsScreen.tsx`);

**Component:** `Badge` (`client/src/components/hud/Badge`); the winner display and match-end summary appear;

**System operation:** the client renders the final authoritative result for all players;

**State change:** the room is now in results state.
3.

**Screen shown:** `ResultsScreen`;

**Component:** `Button` (`client/src/components/results/Button`); the host or any player clicks **Replay to Lobby**;

**System operation:** the client sends a return-to-lobby request to the server;

**State change:** the room prepares a fresh lobby session.
4.

**Screen shown:** `RoomLobbyScreen`;

**Component:** `Badge` (`client/src/components/lobby/Badge`); the room returns to lobby with players retained in the room if still connected;

**System operation:** the server resets match-specific state such as hearts, positions, timers, phase, and firing order;

**State change:** the next match can be started manually again.

**Failure Paths**  
-

**Failure condition:** winner cannot be determined because room state is incomplete.  

**Exact error shown:** `Waiting for final match result…`  

**State after failure:** remains on match or results pending state.  

**Recovery action available:** automatic resync from server state.

-

**Failure condition:** replay-to-lobby request comes from a non-authorized state or stale client.  

**Exact error shown:** `This match has already ended.`  

**State after failure:** client stays on `ResultsScreen` or returns to synchronized room state.  

**Recovery action available:** reload current room state.

-

**Failure condition:** server rejects replay because the room was reset.  

**Exact error shown:** `The room was reset. Returning to lobby.`  

**State after failure:** client transitions to `LandingScreen`.  

**Recovery action available:** create or join a new room.

-

**Failure condition:** network disconnect while on results screen.  

**Exact error shown:** `Connection lost. Reconnecting…`  

**State after failure:** transitions to `ConnectingScreen`.  

**Recovery action available:** automatic reconnect into results or lobby if the room remains active.

**Empty State**  
Before the match ends, `ResultsScreen` is not reachable. Once reached, it initially has no rematch action performed and only the final outcome to acknowledge.

**Edge Cases**  
- If the server restarts after match end but before replay-to-lobby completes, the client must return to landing rather than showing stale results.
- A reconnecting player who refreshes during results should see the same winner state and be able to replay only if the room still exists.
- Replay-to-lobby must clear all transient shot lines, muzzle flashes, sonar snapshots, and elimination states.
- The room should support repeated play loops without page reload, assuming the server session persists.

---
### Reconnect / Refresh / Wake Server Flow

**Trigger**  
A player refreshes the page, temporarily disconnects, opens the app while the Render server is asleep, or reconnects after a short network interruption.

**Happy Path**  
1.

**Screen shown:** `ConnectingScreen`;

**Component:** `Badge` (`client/src/components/navigation/Badge`); the app detects an existing session token or room context and begins reconnecting;

**System operation:** the client attempts to re-establish the Colyseus connection to the configured endpoint;

**State change:** reconnect pending state is active.
2.

**Screen shown:** `ConnectingScreen`;

**Component:** `Badge` (`client/src/components/navigation/Badge`); the server wakes or accepts the reconnect;

**System operation:** the room restores the player into the current authoritative state or assigns spectator status if appropriate;

**State change:** the session is reattached to live room state.
3.

**Screen shown:** `RoomLobbyScreen`, `MatchScreen`, `SpectatorScreen`, or `ResultsScreen`;

**Component:** `Badge` (`client/src/components/navigation/Badge`); the client routes to the correct screen based on the server’s current phase and role;

**System operation:** route guard resolves the active screen from room state;

**State change:** the player resumes from the correct point without starting over.
4.

**Screen shown:** whichever screen matches room state;

**Component:** `Badge` (`client/src/components/navigation/Badge`); gameplay or lobby interaction continues;

**System operation:** the client resumes normal synchronization and input handling;

**State change:** the reconnect is complete.

**Failure Paths**  
-

**Failure condition:** server remains asleep for an extended period.  

**Exact error shown:** `Waking multiplayer server…`  

**State after failure:** remains on `ConnectingScreen` and retries.  

**Recovery action available:** automatic retry.

-

**Failure condition:** session token is invalid or expired.  

**Exact error shown:** `Your session expired. Please join again.`  

**State after failure:** returns to `LandingScreen`.  

**Recovery action available:** enter name and room code again.

-

**Failure condition:** reconnect request succeeds but room state has been lost due to server restart.  

**Exact error shown:** `The room was reset. Returning to lobby.`  

**State after failure:** returns to `LandingScreen` or a fresh lobby.  

**Recovery action available:** create/join a new room.

-

**Failure condition:** browser offline or no network connection.  

**Exact error shown:** `You are offline. Reconnecting when back online.`  

**State after failure:** remains on `ConnectingScreen`.  

**Recovery action available:** reconnect automatically when network returns.

-

**Failure condition:** Colyseus room refuses reconnection because the room code no longer maps to live state.  

**Exact error shown:** `That room code could not be found.`  

**State after failure:** returns to `LandingScreen`.  

**Recovery action available:** join a different room or create a new one.

**Empty State**  
On a fresh load with no session context, `ConnectingScreen` is not shown; the app begins at `LandingScreen`. When a reconnect is needed, the screen starts with no active room data visible until the connection succeeds.

**Edge Cases**  
- Reconnection must restore the same player identity and private state when the room is still alive, not create a duplicate player.
- If the reconnect happens during resolution, the client must resume at the correct shot index and not replay already resolved shots as new events.
- If multiple tabs attempt to reconnect with the same session token, the server should keep the latest live connection authoritative and demote older connections gracefully.
- A reconnecting player who was eliminated before disconnect must return as spectator, not active player.

## Global States

-

**Loading overlay behavior:** Use a blocking loading overlay only when the app is waiting on an authoritative transition that cannot be interacted with safely, including create/join pending, room-restore pending, phase transition reconciliation, and replay-to-lobby submission. The overlay must preserve the current screen context and dismiss immediately on success or failure.
- **Offline/no-connection banner:** When browser connectivity is lost, show a persistent in-app no-connection banner and disable new network actions. Existing authoritative room state remains visible but stale until connection resumes.
-

**Session expiry interception:** If any authenticated room action returns session-expired, the client must intercept it globally, clear the stale token, and route to `LandingScreen` with `Your session expired. Please join again.` rather than leaving the user on a broken screen.
-

**App update prompt:** If the client receives a version-mismatch or stale-build signal from the server or hosting environment, show a global update prompt that instructs the user to refresh the page. If the build cannot be reconciled after refresh, return to `LandingScreen`. The prompt must not interrupt ongoing authoritative replay of already received state except where the server requires a forced reconnect.

## Monetization Flows

None for v1.