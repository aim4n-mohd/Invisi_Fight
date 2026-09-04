# Invisi Fight V3 — Echo Hunt implementation-ready build plan

Status: authoritative design and implementation handoff. This document plans V3 only; it does not authorize or contain a runtime implementation.

Repository baseline inspected on 2026-09-03:

- Branch: main
- Commit: 0e65121dfc18ebb6f14394e26df8622748fd39bc
- pnpm run ci: passed, including lint, typecheck, 95 unit/integration tests, and production builds
- pnpm run test:e2e: passed all 12 existing Classic scenarios on Playwright Chromium, Firefox, and WebKit
- Production renderer: Three.js 2.5D; Phaser remains a fallback
- Production topology: GitHub Pages client and Render Free server in Singapore

This is the only V3 plan a fresh implementation session needs. The older build-plan-artifacts and v2-build-plan-artifacts folders are historical context, not V3 authority.

## 1. Source precedence and scope control

When sources disagree, use this order:

1. The finalized decisions in this document.
2. Existing authentication, reconnect, hidden-information, and server-authority protections in the runtime.
3. Current code as the baseline for behavior this document says to preserve.
4. V2 documents only where this plan explicitly references unchanged Classic behavior.
5. Older generated planning material.

The implementation must not reinterpret superseded ideas as optional V3 work. In particular, V3 has unlimited ammunition and no reload system.

## 2. Version overview

### Goal

V3 makes Echo Hunt the default and primary game. It replaces blind guessing with a continuous risk-and-information loop: movement leaves approximate sound traces, deliberate tools reveal more information, and firing creates the clearest exposure. The game should be immediately readable, quick to replay, and visually restrained enough to feel engineered rather than generated from a collection of cards.

### Intended experience

- Enter a private room with minimal friction.
- Learn the controls before connecting, then enter the arena immediately.
- Practice harmlessly while alone instead of waiting on a lobby page.
- Track opponents through world-space sound graphics supported by audio.
- Choose between quiet walking, revealing speed, sonar precision, one deceptive footstep trail, and a loud shot.
- Understand hits, misses, damage, elimination, connection state, and the next match without leaving the arena.
- Keep the entire arena framed so no player becomes lost.

### Mode relationship

| Area         | Echo Hunt                                      | Classic                                       |
| ------------ | ---------------------------------------------- | --------------------------------------------- |
| Product role | Default and primary V3 mode                    | Secondary preserved mode                      |
| Match loop   | Continuous real-time FFA                       | Existing Hunt, Commit, Resolution, Recap loop |
| Waiting      | Harmless arena practice                        | Existing lobby and host start                 |
| Start        | Automatic five-second countdown at two players | Existing host-controlled start                |
| Combat       | Fire at any time, subject to cooldown          | Existing committed firing order               |
| Health       | Three hearts                                   | Existing two hearts                           |
| Replay       | In-arena ready-up and countdown                | Existing replay-to-lobby behavior             |
| Renderer     | Three.js production path                       | Existing Three.js path and Phaser fallback    |

Echo Hunt supports two to four active fighters plus read-only spectators. Balance and polish target one-versus-one first. With three or four fighters, the same rules form a free-for-all: no teams, one non-piercing first-hit ray per shot, and the last living fighter wins. The product's existing two-to-four active-player limit also remains true for Classic.

## 3. Final decision record

### Later decisions that override earlier ideas

| Topic             | Final V3 decision                                                       | Superseded or rejected idea                                                                                                                  |
| ----------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Ammunition        | Unlimited ammunition; only fire cooldown and self-reveal limit shooting | Three bullets, graphical bullet slots, automatic/manual reload, and two-tone reload audio                                                    |
| Sound reach       | Every gameplay sound is perceivable across the entire arena             | Distance-limited hearing or a hearing radius                                                                                                 |
| Movement          | Walk; hold Shift to run                                                 | Crouch, multiple stealth stances, or material-dependent footsteps                                                                            |
| Footstep accuracy | Server-generated approximate positions with variance                    | Exact movement position reveals                                                                                                              |
| Decoy input       | Right-click in the arena                                                | A HUD decoy button as the primary input                                                                                                      |
| Decoy effect      | One short walking trail moving toward the cursor                        | A generic stationary ping or arbitrary fake gunshot                                                                                          |
| Solo play         | Harmless waiting-room practice only                                     | A bot or solo bot match                                                                                                                      |
| Arena             | Simple open space                                                       | Cover, obstacles, walls, floor materials, or map variants                                                                                    |
| HUD               | Bottom overlays on a full-screen arena                                  | Separate information cards around a small arena                                                                                              |
| Sonar UI          | Bottom cooldown/status; no persistent ring attached to the fighter      | A cooldown/status ring around the player                                                                                                     |
| Settings          | Master, music, SFX, and fullscreen only                                 | Control rebinding, graphics selector, color-blind setting, stereo-direction setting, in-app reduced-motion setting, and camera-shake setting |
| Main mode         | Echo Hunt                                                               | Treating the existing guessing game as the primary mode                                                                                      |
| Classic           | Preserve it as the secondary mode                                       | Redesigning Classic during V3                                                                                                                |

The transient expanding sonar wave remains valid feedback; “no sonar ring around the player” means no persistent player-attached cooldown or information ring.

### Accepted V3 behaviors

- Echo Hunt is continuous rather than divided into Classic firing phases.
- Walking is faint. Running is louder and more frequent. Gunfire is the clearest reveal.
- Sound is represented graphically in the world because visuals, not stereo hearing, carry required location information.
- Sonar remains a deliberate full-arena precision tool with a server-authoritative cooldown.
- Echo Hunt has a Final Echo anti-stall state after the normal hunt duration.
- Combat feedback includes muzzle flash, tracer, small camera kick, distinct hit and miss impacts, hit confirmation, health response, and brief visual-only hit-stop.
- End-of-match feedback includes useful stats and a small number of awards.
- A room-local rivalry score carries across rematches but is never persisted.
- Invite links, clear readiness, host transfer, reconnect status, and an in-arena rematch are part of the polished flow.
- The operating system reduced-motion preference remains respected even though V3 adds no reduced-motion setting.

## 4. Finalized observable requirements

### 4.1 Mode entry and landing page

1. Echo Hunt is selected by default and owns the primary Create and Join actions.
2. Classic remains visibly available as a quieter secondary choice. Selecting Classic must not silently create an Echo room.
3. A room's mode is immutable for its lifetime and visible on the landing intent, room overlay, invite URL, and results overlay.
4. A share URL contains the room code and mode as query parameters under the configured GitHub Pages base path. Opening it preselects the mode and room code but does not bypass display-name validation or the controls popup.
5. Manual joins use the selected mode. A mode mismatch returns a clear “room not found in this mode” message rather than silently joining or creating another room.
6. The redesigned landing page contains only the product name, display-name input, primary Echo action, concise Join controls, a secondary Classic choice, settings, and honest connection status. Remove explanatory card stacks and decorative technical copy.
7. Behind the landing controls, two noninteractive fighters continuously move and shoot at each other. The simulation has no network room, health, hit, win, or persistence semantics.
8. The landing simulation is muted, aria-hidden, pointer-events none, deterministic enough to test, paused when the page is hidden, reduced to a static tableau when the operating system requests reduced motion, reset safely after long frame gaps, and fully disposed when leaving the landing page.
9. Use the lifecycle pattern from C:\Users\aiman\OneDrive\Documents\Mooze_Games\RPScissors V2.2\src\ui\LandingBackground.tsx and landingSimulation.ts: requestAnimationFrame ownership, visibility handling, deterministic setup, and cleanup. Do not import that project's gameplay model.
10. Implement the attract scene as a dedicated Three.js presentation module that reuses ArenaRenderer, FighterModel, CameraController, and a minimal local tracer effect. It must not instantiate ThreeGame, Colyseus, Zustand match stores, or gameplay audio. Lazy-load it after the essential landing form renders so the form is not blocked by the Three.js chunk.

### 4.2 Pre-arena controls popup

1. After a valid intentional Create or Join submission, show a compact modal before starting the network create/join operation.
2. The modal's close X is the continue action. Closing it starts the pending create/join, unlocks browser audio from that user gesture, and then exposes the arena once connected.
3. Do not join a room behind the modal. Otherwise a second player could trigger the five-second countdown while unable to see it.
4. Echo copy must remain very short:
   - Move: WASD or arrow keys; hold Shift to run
   - Aim and fire: mouse and left-click
   - Steps reveal approximate positions; shots expose you
   - Sonar: Space
   - Decoy: right-click, once per match
   - Last fighter standing wins
5. Classic receives mode-appropriate copy rather than Echo instructions:
   - Move during Hunt: WASD or arrow keys
   - Sonar: Space
   - Aim with mouse; click to lock during Commit
   - Two hearts; last fighter standing wins
   - The host starts from the lobby
6. The modal is keyboard reachable, traps focus, labels the X, and returns focus correctly if canceled through a secondary Back action.
7. Automatic reconnect after a refresh must not wait behind this modal; it restores the existing session immediately. An intentional new create/join always shows it.

### 4.3 Arena, camera, and presentation

1. Echo's game canvas fills the available viewport using dynamic viewport units and safe-area padding.
2. The camera continues to frame the complete 960 by 540 world. Do not crop or zoom so far that arena edges or distant sound cues disappear.
3. Increase the Echo fighter model approximately 15–20 percent over Classic, then give Echo a slightly forgiving hit radius that matches or modestly exceeds the visible body.
4. Keep the open arena readable and uncluttered. Do not add walls, cover, floor material regions, collision props, or decorative objects that resemble gameplay cover.
5. Match information and interactive cards are compact overlays along the bottom. The only centered elements are brief, non-card announcements such as countdown numerals, Final Echo, a hit/elimination label, or a reconnect veil. Results expand from the bottom overlay rather than becoming a separate centered card.
6. No Echo phase transition may destroy and recreate the canvas. Practice, countdown, active play, Final Echo, elimination spectating, and results use one stable Echo arena screen and renderer instance.
7. Classic may keep its current screen mounting behavior; do not refactor it merely for symmetry.

### 4.4 Controls and movement

1. WASD and arrow keys are equivalent movement bindings.
2. Movement is normalized so diagonals are not faster.
3. Echo walks at the normal movement speed. Holding either Shift key while moving requests running.
4. Releasing movement keys, losing window focus, opening an input/modal, disconnecting, or being eliminated sends or resolves to zero movement.
5. The server owns movement, clamps it to arena bounds using the mode's body radius, chooses walk/run speed, rate-limits messages, and ignores invalid values.
6. Echo participants can move and aim during waiting practice, countdown, active play, and Final Echo. At the instant an active match starts, the server replaces practice positions with fair spawn positions.
7. Classic keeps its current phase restrictions and speed. The only intentional Classic input change is arrow-key movement parity.
8. Fighters pass through one another. Invisible body collision must not become an unintended position detector.

### 4.5 Sound information model

1. All gameplay sound events are delivered to every connected client in the room, including their source and spectators, regardless of world distance.
2. There is no range test and no distance-based omission. Audio volume may differ by sound category, but distance may not make an event inaudible or invisible.
3. Required location information is drawn at the event's public world coordinate. Audio is supplemental and must never reveal a more exact source than the public event coordinate.
4. Real footsteps use server-authoritative movement and server-generated randomness. Clients do not decide when or where an opponent's cue appears.
5. Walking produces faint, less frequent footstep cues with a broad location variance.
6. Running produces louder, more frequent cues. Its markers may be more confident than walking, but must still be approximate.
7. Every approximate coordinate is clamped to the arena. Repeated cues must form a useful trail without exposing continuous exact movement.
8. Public movement-sound events are anonymous. They include an event ID, a walk/run presentation profile, approximate coordinate, normalized intensity, server timestamps, and lifetime. They do not include player ID, true origin, velocity, or a decoy flag.
9. Events use server timestamps and IDs, and the client deduplicates, caps, and expires them. A burst must not be collapsed into one last event.
10. The bottom sound meter reports the local player's recent emitted loudness, not nearby enemy volume and not microphone input. It decays smoothly from red through yellow to green/quiet.
11. The meter and cue visuals avoid numeric decibel claims. Their purpose is risk feedback.

### 4.6 Footstep and action audio

1. Add short walk and run footstep sounds. Running is clearly louder or sharper and plays at its faster cadence.
2. The decoy reuses the exact walking sound and world marker presentation.
3. Keep distinct sonar and gunshot identities; use the existing assets where they remain suitable.
4. Add restrained hit and miss feedback sounds if visual feedback alone is ambiguous.
5. No reload asset, logic, or sound is part of V3.
6. A central audio manager applies master, music, and SFX levels, supports overlapping short events without cutting off earlier ones, and handles AudioContext unlock failure gracefully.
7. Any panning uses the same approximate public coordinate as its cue. Location must remain understandable with mono output.

### 4.7 Decoy

1. Each Echo participant receives exactly one decoy use per active match.
2. Right-click inside the Echo arena requests it. Suppress the browser context menu only for the arena interaction; normal context menus continue elsewhere.
3. The aim direction at activation comes from the mouse ground projection. The server validates the angle and starts the decoy from the participant's authoritative position.
4. A decoy is a short sequence of walking footsteps traveling toward that direction for roughly one to one-and-a-half seconds. The path stops at arena boundaries.
5. To opponents and spectators, every decoy step uses the same public event schema, walk audio, marker, intensity range, jitter process, and lifetime as a real walking step. No public field or companion event may reveal that it is fake.
6. The owner receives only private acceptance/rejection and availability state.
7. A rejected request does not consume the use. The server rejects stale, duplicate, invalid, wrong-mode, wrong-phase, eliminated, or already-used requests.
8. Waiting practice permits repeated decoy testing without carrying consumption into the match. Starting the match restores exactly one use.
9. Reconnect restores the authoritative availability state; refreshing cannot replenish a used decoy.

### 4.8 Sonar and Final Echo

1. Space activates sonar in Echo when its server-authoritative cooldown is ready.
2. Echo sonar covers the full arena. The detecting player receives frozen private opponent snapshots; opponents and spectators receive the public approximate sonar emission.
3. Sonar is loud on the local sound meter and in world feedback. It is a deliberate tradeoff, not passive scanning.
4. Render a brief expanding activation wave, but put cooldown and readiness in the bottom overlay rather than a persistent ring around the fighter.
5. Practice sonar animates and enters cooldown even if there is nobody to detect. Active-match start resets it to ready.
6. After the normal Echo Hunt duration, the server enters Final Echo instead of ending in a timeout or draw.
7. During Final Echo, normal movement, firing, sonar, damage, and decoy rules continue. In addition, every living fighter emits a strong anonymous approximate position cue at the configured interval.
8. Final Echo has no fixed kill timer. It continues until one fighter remains or the active roster collapses through departures.

### 4.9 Shooting, health, and hit feedback

1. Left-click fires immediately in Echo whenever the local participant is alive and the server-authoritative fire cooldown is ready.
2. Ammunition is unlimited. There is no ammo count, bullet-slot HUD, magazine, reload key, automatic reload, or reload delay.
3. Each accepted shot starts its cooldown. Holding the button does not produce automatic fire; each shot requires a deliberate click. The server rate limit remains authoritative even if a modified client sends faster requests.
4. The client sends an aim direction, sequence, token, and client timestamp. The server uses its authoritative current shooter position as the ray origin and never accepts client position or client-declared hits.
5. The ray hits the nearest living opponent intersecting the Echo hit radius and stops there. There is no penetration, cover, splash damage, or friendly-fire concept in FFA.
6. Accepted shots are resolved in server receipt order. A fighter already eliminated when a later request is processed cannot fire; client timestamps do not reorder combat.
7. Echo participants start each active match with three hearts. Each hit removes one heart. Zero hearts eliminates the fighter.
8. A gunshot deliberately exposes more than a footstep: broadcast its authoritative muzzle origin, tracer endpoint, shooter identity, and result. A hit endpoint is also a momentary impact-location reveal. These shot facts are not continuous public position state.
9. The shooter gets immediate predicted muzzle flash, gunshot audio, and small camera kick. Damage, hit marker, impact, elimination, and authoritative tracer outcome wait for the server event.
10. A miss has a distinct endpoint impact. A hit has a clear target impact, health change, local victim response, and short visual-only hit-stop. Hit-stop never pauses server simulation or networking.
11. Camera displacement is small and returns immediately; it may not lose the arena framing. Respect the operating system reduced-motion preference without adding an in-app motion setting.

### 4.10 Waiting, countdown, match, and results lifecycle

Echo's server-owned lifecycle is:

Lobby/practice -> five-second countdown -> Echo Hunt -> Final Echo if needed -> results -> ready-up -> five-second countdown -> next match.

1. The first Echo player enters the arena in practice immediately after connection.
2. Practice allows movement, aim, fire effects, footsteps, sonar, and reusable decoy. It never changes hearts, records match stats, awards wins, or eliminates anyone.
3. When a second connected Echo player occupies an active seat, the server automatically begins a five-second countdown.
4. Up to four players may occupy active seats before the countdown locks. A fifth or later client is a spectator.
5. Practice movement and harmless actions remain available during the countdown, but the countdown overlay is dominant and readable.
6. If connected active seats fall below two during countdown, cancel it. Return to initial practice before match one, or the results/ready state before a rematch.
7. At zero, derive evenly separated spawn positions for the final two-to-four fighter roster and atomically reset hearts, alive state, input, fire and sonar readiness, decoy use, transient effects, current-match stats, and winner state.
8. Third and fourth players joining during an active match become spectators; they never spawn mid-match.
9. The last living fighter wins. The server records the room-local win and publishes results after the final damage event is readable.
10. Results are an overlay on the same Echo arena. Show the winner, concise player stats, no more than a few earned awards, room-local rivalry score, readiness, invite action, leave action, and Play again or Join next match.
11. For rematch, any connected client may opt into the next roster. Previous participants see Play again; spectators see Join next match. The server reserves at most four seats in request order.
12. Once at least two clients have opted in, start the five-second rematch countdown. Additional opt-ins may fill remaining seats until countdown lock; nonparticipants spectate.
13. No host-only Start button exists in Echo. Classic retains its host Start button.
14. Match statistics and rivalry wins live only in the room process and reset when the room is disposed.

### 4.11 Join, leave, reconnect, host, and spectator behavior

1. Enforce two-to-four active fighters separately from the room's total client capacity so spectators and reconnect reservations remain possible. Echo uses the seat lifecycle below; Classic keeps its existing lifecycle but must not admit a fifth active fighter.
2. A participant who disconnects has movement zeroed immediately and remains reserved for the existing reconnect grace period.
3. During an active match, a reserved disconnected fighter remains in authoritative state and can be hit. If their reconnect grace expires, remove them and re-evaluate the winner.
4. During countdown, connected-seat count controls cancellation. A reconnect can re-enter practice and cause a fresh countdown.
5. Reconnect restores mode, role/seat, exact private position where appropriate, health, alive state, fire readiness, sonar readiness, decoy availability, ready state, and the latest public match snapshot.
6. Host status transfers to a connected room member when the host leaves. Echo does not grant the host gameplay power; Classic host behavior stays intact.
7. Echo elimination does not remove current-roster membership or rewrite the player into the legacy spectator role. Mark them dead, stop private movement updates and action acceptance, and route their client into read-only in-arena spectating while preserving eligibility to ready for the next match.
8. Spectators see the roster, health/alive state, public anonymous sound cues, public sonar emissions, shots, impacts, timers, and results. They never receive exact live opponent positions, private sonar snapshots, private cooldowns, decoy availability, or hidden aim.
9. Late spectators remain spectators until they explicitly opt into a results-stage next-match seat.
10. Classic keeps its existing late-join and replay role behavior unless a shared protocol adaptation is strictly required. The explicit four-fighter cap is a conformance fix to the already stated two-to-four scope, not a Classic redesign.

### 4.12 HUD and UI

1. The Echo bottom overlay contains:
   - compact roster/heart status
   - local sound meter
   - sonar readiness/cooldown
   - decoy available/used state
   - current state and timer
   - compact room code/invite access
   - connection/reconnect indicator
2. Do not show ammunition or reload UI.
3. Use words and icons together for critical state; color is supportive rather than the only carrier even though no color-blind settings panel is required.
4. The sound meter is green at low output, blends through yellow, and reaches red for loud actions.
5. Countdown, Final Echo, elimination, reconnect, and results overlays must not permanently obscure the arena.
6. UI copy is short, specific, and action-oriented. Avoid lore paragraphs, generic slogans, repeated instructions, excessive badges, and nested card grids.
7. Preserve semantic forms, visible focus, button disabled states, useful aria labels, and keyboard navigation.
8. Fullscreen is a user-gesture action using the browser Fullscreen API. Failure leaves the game usable and reports a short nonblocking message.
9. Apply the restrained typography, buttons, status language, spacing, and reduced-copy design system to shared and Classic screens, but do not add Echo controls or change Classic's information/interaction flow. Echo alone gets the new full-screen bottom-overlay match layout.

### 4.13 Settings

1. Provide Master, Music, and SFX levels plus Fullscreen.
2. Persist volume preferences locally and apply them before the next eligible playback.
3. Include one subtle ambient music bed so the Music control has a real effect. It never conveys gameplay information, pauses appropriately with page lifecycle, and starts only after a valid user gesture. The landing combat simulation itself is always muted.
4. Do not add the rejected settings listed in the decision record.
5. Existing environment-level renderer selection remains an engineering fallback, not an end-user graphics setting.

### 4.14 Server readiness and the Brave issue

Required behavior:

1. Opening the landing page immediately sends a lightweight no-store readiness request.
2. While the landing screen remains mounted, schedule a deduplicated keepalive approximately every eight minutes, including while hidden when the browser permits it. On visibility return, send another readiness request because background timers may have been throttled or suspended.
3. Once a room WebSocket is open, that live connection is sufficient activity; stop landing keepalive ownership when leaving the landing screen.
4. Browser suspension, device sleep, or an OS-frozen tab cannot be guaranteed to keep Render awake. This is an honest platform limit, not a reason to add a permanent backend.
5. A failed or blocked health request must never prevent the actual Colyseus create, join, or reconnect attempt.
6. Connection copy reflects evidence:
   - Checking server for an in-flight health probe
   - Connecting to room for the actual matchmaker/WebSocket attempt
   - Server may be starting only after the actual attempt is slow
   - Unable to connect only after the actual attempt fails
7. Never label every fetch exception, abort, CORS rejection, privacy-blocker rejection, DNS error, or non-OK response as “server waking.”
8. Do not automatically retry room creation in a way that can create duplicate orphan rooms after an ambiguous response. Keep one in-flight operation, deduplicate user clicks, and offer a deliberate retry after failure. Join/reconnect retries must also avoid duplicate attached clients.

Diagnosis from the inspected repository:

- ServerWakeService currently performs up to twelve GET requests to healthz, each with a five-second timeout and exponential delay.
- InvisiFightClient waits for that service before every create, join, and reconnect.
- ServerWakeService catches all fetch failures and treats them as the same sleeping condition.
- ConnectingScreen therefore can remain on “waking server” even when the real Colyseus endpoint would work.
- The live health endpoint was reachable during this planning audit and returned build SHA 0e65121dfc18ebb6f14394e26df8622748fd39bc.
- A request carrying the configured GitHub Pages Origin received the expected Access-Control-Allow-Origin header. The current deployed CORS configuration is therefore not obviously wrong.
- A read-only OPTIONS check of the live Colyseus create-matchmaker route also returned the expected Pages origin, POST/content-type allowances, and Access-Control-Allow-Credentials. Do not begin by loosening CORS to a wildcard; capture the actual failing Brave request first.

The Brave report was not reproduced in an automated Brave session, so the exact browser-level trigger is not proven. The likely affected path is nevertheless concrete: a Brave Shield, extension, privacy policy, cache, or transient health-fetch failure becomes a hard false-negative gate. The architectural fix is to make health probing advisory and treat the real room transport as authoritative. Live Chrome/Brave testing remains required after implementation.

## 5. Explicit non-goals

- No redesign of Classic mechanics, timings, health, firing order, lobby start, recap, or replay flow. Enforcing its existing four-active-fighter product limit is the one roster correction.
- No bots or offline solo match.
- No accounts, profiles, persistence database, cloud stats, leaderboards, progression, achievements, analytics, ads, or monetization.
- No public matchmaking, chat, teams, party system, or friends system.
- No mobile or touch controls.
- No control rebinding.
- No weapons, weapon selection, ammunition, reload, classes, power-ups, pickups, abilities beyond the defined sonar and decoy, or projectile simulation.
- No alternate arenas, cover, collision obstacles, floor materials, terrain acoustics, destructibles, or procedural maps.
- No distance-limited sound system.
- No voice, microphone, WebRTC audio, or audio-calibration flow.
- No end-user graphics/renderer selector.
- No new in-app settings for color-blind cues, stereo direction, reduced motion, or camera shake.
- No replay file, kill-cam, match timeline, or persistent match history.
- No requirement to reproduce Echo in the Phaser fallback. Phaser remains a Classic engineering fallback.
- No paid uptime service or infrastructure migration. The landing keepalive is best-effort within Render Free and browser limits.

## 6. Existing architecture context

### Workspace and ownership

| Layer  | Current responsibility                                                                                      | V3 implication                                                                                    |
| ------ | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| shared | Gameplay constants, phase/types, geometry, and Zod network contracts                                        | Add mode-discriminated constants and messages; bump protocol                                      |
| server | Express health/config endpoints, Colyseus room, sessions, authoritative movement, sonar, combat, lifecycle  | Own all Echo truth, sound randomness, cooldowns, damage, roster, stats, and transitions           |
| client | DOM screens, Zustand stores, Colyseus adapter, private/public routing, Three.js and Phaser renderers, audio | Collect intent, predict presentation only, render public cues and private state, own ergonomic UI |

### Relevant files and current constraints

#### Shared

- shared/src/config/gameplayConfig.ts is a flat V2 object. It currently mixes Classic values with common arena/network values: protocol 2, two hearts, 15-second Hunt, three-second sonar, speed 165, body radius 16, and shot radius 22.
- shared/src/types/match.ts defines the six Classic phases and a public state shape plus private exact movement, private sonar, shot resolution, and input types.
- shared/src/types/network.ts validates join, movement, sonar, and shot-lock messages. New action schemas must remain strict and bounded.
- shared/src/utils/geometry.ts is the correct home for mode-independent vector, clamping, and ray helpers.

#### Server

- server/src/rooms/InvisiFightRoom.ts is the authoritative monolithic room. It owns sessions, public schema, runtime combatants, simulation, join/leave, the Classic phase machine, sonar, shot locking/resolution, replay, and winner handling. Its current reset-to-lobby path promotes all connected room members to players, so it must be capped deliberately rather than re-promoting a fifth spectator.
- server/src/rooms/InvisiFightRoomState.ts is the Colyseus public schema. Exact active positions are not published; only private state carries the local fighter position.
- server/src/rooms/InvisiFightRoomMessages.ts centralizes message names.
- server/src/services/CombatResolver.ts uses the global Classic hit radius and locked aim. It must accept mode-specific parameters or be wrapped without changing Classic results.
- server/src/services/SonarService.ts owns quantized public emissions and private frozen detections. It must accept mode-specific cooldown/phase policy while retaining the Classic path.
- server/src/services/RoomAuthService.ts currently assigns every lobby join as a player and later joins as spectators; there is no explicit four-active-fighter guard. Add the shared four-fighter limit, then give Echo its mode-aware seat lifecycle.
- server/src/services/InputRateLimiter.ts, SessionService.ts, and MatchClock.ts should be reused. SessionService currently stores a role in the token record even though host/spectator/player roles can change; the room state, not that stale token field, already controls actions.
- server/src/app.ts exposes healthz and api/v1/config and configures exact-origin CORS. render.yaml sets the production Pages origins and a 15-second reconnect grace.

#### Client

- client/src/network/colyseusClient.ts is the room adapter and routing hub. It currently hard-gates transport on ServerWakeService and maps one phase to one whole-screen DOM screen.
- client/src/network/ServerWakeService.ts is the identified false-waking gate.
- client/src/state/matchViewStore.ts keeps only lastShot. That is insufficient for real-time fire and concurrent FFA events; Echo needs bounded event queues.
- client/src/state/privateSnapshotStore.ts correctly separates exact local position and private sonar/shot state.
- client/src/app/App.ts replaces the complete screen DOM whenever uiStore changes. Current MatchScreen and SpectatorScreen mount and dispose the arena independently. Echo needs one stable arena screen across its lifecycle.
- client/src/app/Router.ts writes route paths but does not parse invite launch intent on initial load.
- client/src/app/screens/LandingScreen.ts calls room creation/join directly and has no attract scene, mode, invite parsing, modal, or landing warmup.
- client/src/game/input/KeyboardMovementController.ts supports only WASD and Space.
- client/src/game-three/ThreeGame.ts owns the production input/render loop. GroundAimProjector already provides arena mouse direction.
- FighterModel, CameraController, ArenaRenderer, FighterRenderer, AimRenderer, SonarRenderer, and ShotEffects are reusable presentation seams.
- ShotEffects and the Phaser EffectsSystem deduplicate a single lastShot; Echo requires queue-based playback.
- Existing audio assets are sonar-ping.wav and gunshot.wav. SonarPingAudio is not yet a central mixer/settings system.
- client/src/styles/design-tokens.css and global.css contain the current card-heavy landing and small game-frame layout.

### Existing data and privacy flow

1. A client joins through Colyseus with display name, room code, and optional signed session token.
2. The server maps the transport to an authenticated runtime player.
3. Public Colyseus schema contains roster, health, roles, phase, and only phase-appropriate revealed data.
4. Exact local position, velocity, and aim are sent privately to that player.
5. Private sonar snapshots go only to the detector.
6. Public approximate sonar and public resolved shots are broadcast.
7. The client interpolates only its private local state and renders permitted public events.

V3 must preserve this boundary. Echo sound is a new intentionally approximate public event stream, not permission to publish continuous positions.

### Current lifecycle that must remain for Classic

Lobby -> Hunt -> Commit -> Resolution -> Recap -> next Hunt or Results -> replay to Lobby.

Classic currently has host start, 15-second Hunt, three-second Commit, sequential firing resolution, three-second sonar cooldown, two hearts, 165 px/s movement, body radius 16, hit radius 22, late spectators, and reconnect/session behavior. Freeze these through characterization tests before branching V3 logic. The inspected join policy does not enforce the documented four-player ceiling in the lobby; add only that explicit cap as a shared product-conformance correction.

## 7. Technical approach

### 7.1 Mode boundary

Add GameMode with echo_hunt and classic. The creator supplies mode; the server stores it once and exposes it in public state and session-ready data. Add mode to Colyseus room filtering with roomCode so a client cannot accidentally find the wrong mode. Joining never changes a room's mode.

Keep one InvisiFightRoom type and one session/privacy model. At clear message, simulation, lifecycle, and reset boundaries, dispatch to mode-specific behavior. Avoid copying the room or refactoring the stable Classic path wholesale.

Recommended structure:

- Keep current Classic methods and values as compatibility behavior.
- Add an EchoMatchService or similarly focused controller for Echo lifecycle, active seats, cooldowns, stats, and reset state.
- Add an EchoSoundService for movement cadence, jitter, decoy scheduling, and Final Echo cues.
- Parameterize reusable CombatResolver and SonarService inputs instead of changing their defaults.
- Add small mode policy helpers for allowed phases/actions and mode config selection.

The public Colyseus schema can remain a superset because its schema system does not naturally encode discriminated unions. Add mode and only the minimal Echo public fields, using inert defaults in Classic. Client selectors must branch on mode and reject illegal mode/phase combinations.

Keep the existing revealedX, revealedY, and lockedAimAngleRad fields at their hidden/sentinel values throughout Echo. Do not call the Classic reveal-all synchronization path for Echo; exact shot origin and impact are carried only by the short-lived accepted shot event.

### 7.2 Phase and state model

Extend the phase union with countdown, echo_hunt, and final_echo while retaining all Classic names. Echo uses lobby as practice/waiting and results for ready-up. Add mode-phase predicates rather than scattered string comparisons.

Public Echo additions should include:

- mode
- countdown or active phase timestamps
- per-player current-roster membership and ready/next-seat status
- winner
- results stats/awards
- room-local win totals

Private Echo additions should include:

- fireReadyAtServerMs
- sonarReadyAtServerMs
- decoyAvailable
- action request acknowledgements

Server runtime-only state should include:

- exact positions and inputs
- current-roster set, active seat order, and next-match request queue
- per-player footstep cadence accumulator
- true sound origins
- scheduled decoy steps
- cooldowns and last accepted sequences
- current-match stat counters
- room-local rivalry totals

Do not store short sound or shot animations in Colyseus state. Broadcast them as timestamped events and let clients queue them.

For Echo, current-roster membership is the gameplay authority and is independent of isHost and temporary alive state. Do not rely on the legacy host/player/spectator role alone to answer whether an Echo client may act. Elimination sets alive false but keeps current-roster membership; late spectators have no current seat; results ready-up builds a separate next-roster queue.

### 7.3 Network messages

Preserve current message names for Classic. Add and validate:

- input:fire with token, finite aim angle, monotonically increasing sequence, and client timestamp
- input:decoy with token, finite aim angle, sequence, and client timestamp
- input:next-match with token, requested ready boolean, and sequence
- match:sound-cue as the anonymous public sound event
- private:echo-action-status for authoritative fire/sonar/decoy readiness and rejection reasons

Extend input:player with running boolean. The Echo server uses it; Classic explicitly ignores it. Make the schema strict when safe and add compatibility tests around the protocol bump.

Recommended public footstep shape:

- cueId
- profile: walk or run
- approximatePosition
- intensity from zero to one
- emittedAtServerMs
- expiresAtServerMs

A decoy emits that exact shape with profile walk. Final Echo uses a distinct final_echo public profile because it is an explicit global rule, but it still has no source ID or true position.

Results summaries, awards, readiness, and rivalry totals live in the authoritative public room snapshot rather than an event-only payload, so a client reconnecting during results can reconstruct the complete screen. Derive the results entrance animation from the authoritative phase change; do not add a second event source of truth.

An accepted public shot includes the shooter's request sequence or another server-echoed correlation ID. The firing client uses it to reconcile its predicted muzzle flash, sound, and camera kick instead of playing them twice when the authoritative shot arrives. A private rejection clears the matching prediction without fabricating a tracer or hit.

### 7.4 Authority and combat ordering

The client predicts only local responsiveness: aim line, muzzle flash, gunshot playback, camera kick, and perhaps a short pending tracer. The server alone accepts cooldowns, resolves ray geometry, changes hearts, eliminates fighters, chooses a winner, and records stats.

Use server receipt order for simultaneous fire. Never reorder using untrusted client time. Include server event IDs/times so all clients render the same accepted order. If product playtesting later demands trade kills, that is a separate rule change with explicit tie semantics, not an incidental V3 implementation choice.

### 7.5 Sound generation and privacy

Use authoritative displacement/cadence rather than raw input keydown events. A held key against an arena boundary must not emit travel footsteps indefinitely. Reset cadence after a pause so movement does not produce an immediate burst on resume.

Inject the random source into EchoSoundService tests. For each cue:

1. Take the server's true current position.
2. Sample a bounded radial offset using the selected profile.
3. Clamp to arena bounds.
4. Broadcast only the approximate point and presentation profile.
5. Update server-only sound/stat accounting.

Any audio panning and the visual marker both use the approximate point. Never pass the true point into a public client audio call.

### 7.6 Client event routing

Replace lastShot-only consumption for Echo with bounded shot and sound queues:

- deduplicate by event ID
- order by server timestamp then arrival order
- retain enough history for animation lifetime plus clock skew
- cap queue length to prevent memory growth
- prune on render tick and room reset
- clear on leave, mode change, match-start reset, and incompatible reconnect

Keep the existing lastShot compatibility field or adapter for Classic so its renderer and tests do not change unnecessarily.

### 7.7 Stable Echo screen

Add one EchoArenaScreen selected by mode. It mounts the Three.js renderer once and updates overlays based on phase and local alive state. It covers:

- waiting practice
- countdown
- Echo Hunt
- Final Echo
- eliminated spectating
- reconnect overlay while the renderer retains its last safe public view
- results and ready-up

The app routing layer may update the URL without replacing this screen. Do not route an eliminated Echo participant through the existing Classic SpectatorScreen because that destroys the renderer and loses participant identity.

### 7.8 Renderer strategy

Pass an explicit presentation profile into ThreeGame/FighterModel/CameraController rather than reading a changed global radius:

- Classic profile retains current model scale, camera framing, effects, and phase visibility.
- Echo profile uses the larger fighter, continuous local aim, sound markers, real-time shot queues, local sound-meter source events, and bottom-safe camera/layout. It never displays FighterModel's Classic active-shooter ring.

Echo is Three.js-only. Keep the existing environment-selected Phaser route for Classic. If the engineering flag requests Phaser while mode is Echo, use Three.js and log a development-only explanation rather than implementing a second Echo renderer.

Keep the canvas viewport-filling, but pass the measured bottom-overlay inset to Echo camera fitting so the whole 960 by 540 arena lies in the unobscured region above the controls. Do not solve overlay coverage by cropping world edges or allowing markers to hide behind opaque panels.

### 7.9 Landing availability service

Replace the blocking ServerWakeService contract with an app-lifetime ServerAvailabilityService:

- warm is advisory and deduplicates one in-flight health request
- health warming is a simple GET with cache disabled, credentials omitted, and no custom headers
- beginLandingWarmth owns immediate probe, interval, and visibility handler
- endLandingWarmth clears ownership and timers
- status distinguishes response, timeout, blocked/unreachable, and unknown
- create/join/reconnect call Colyseus regardless of probe result
- one connection promise prevents double submission
- UI delay thresholds describe a slow actual connection without claiming a cause

Keep create retries manual after ambiguous failure. A future idempotent matchmaker protocol could support safe automatic creation retries, but it is outside V3.

Retain exact production origin allowlisting for health, matchmaker HTTP, and WebSocket traffic. Do not use wildcard CORS as a workaround for a browser-specific failure.

### 7.10 Settings and audio

Create one settings store with versioned localStorage parsing and defaults. Create one audio manager with master, music, and SFX buses or equivalent gain calculation. Existing sonar and gunshot code should route through it without altering Classic playback timing. Pool or clone short SFX so concurrent FFA events are audible.

Audio initialization should occur on the controls modal X gesture. The game still works if audio is blocked, muted, unavailable, or disabled by the existing test environment variable.

## 8. Configuration and initial tuning

### Structural rules

These are finalized behavior, not casual tuning:

- Echo is default; Classic is secondary.
- Two to four active Echo fighters; primarily balance for 1v1; FFA above two.
- All gameplay sounds reach all clients.
- Walking and running are the only movement states.
- Shift requests running.
- One active-match decoy, activated by right-click, rendered as a moving walking trail.
- Unlimited ammunition and no reload.
- Server-authoritative fire cooldown, movement, sound coordinates, hits, health, lifecycle, and stats.
- Three Echo hearts.
- Five-second automatic countdown.
- Harmless practice before a match.
- Final Echo after the normal hunt window.
- Full-arena framing, bottom overlay HUD, no player-attached sonar status ring.

### Central configuration layout

Split shared configuration into common, classic, and echo sections or exports. Preserve current GAMEPLAY_CONFIG names as Classic-compatible aliases until all call sites are intentionally migrated. Do not globally replace Classic constants with Echo values.

### Recommended initial values

These are starting values for instrumented playtesting. Keep them central and change them only with recorded test observations.

| Value                         |  Initial recommendation | Notes                                                           |
| ----------------------------- | ----------------------: | --------------------------------------------------------------- |
| Arena width x height          |               960 x 540 | Existing common world                                           |
| Network update rate           |                   12 Hz | Existing; verify real-time shots feel responsive before raising |
| Echo walk speed               |                165 px/s | Existing movement feel                                          |
| Echo run speed                |                235 px/s | About 42 percent faster                                         |
| Echo body/bounds radius       |                   19 px | Approximately 19 percent over Classic                           |
| Echo shot hit radius          |                   26 px | Slight forgiveness beyond visible body                          |
| Echo fighter visual scale     |                    1.18 | Relative to current Classic                                     |
| Echo starting hearts          |                       3 | Finalized V3 starting health                                    |
| Fire cooldown                 |                  650 ms | Deliberate click rate; no automatic hold fire                   |
| Countdown                     |                5,000 ms | Finalized                                                       |
| Normal Echo Hunt              |               75,000 ms | Then Final Echo; no timeout loss                                |
| Final Echo interval           |                2,500 ms | One cue per living fighter                                      |
| Echo sonar cooldown           |                6,000 ms | Strong precision tool                                           |
| Walk cue cadence              |     680 ms while moving | Faint and sparse                                                |
| Walk position variance radius |                   60 px | Tune within roughly 50–75 px                                    |
| Run cue cadence               |     340 ms while moving | More frequent                                                   |
| Run position variance radius  |                   36 px | Tune within roughly 25–45 px                                    |
| Decoy duration                |                1,300 ms | Short walking trail                                             |
| Decoy step count              |                       4 | Uses real walk profile                                          |
| Decoy nominal travel          |                  150 px | Clamp at edges                                                  |
| Public cue visual lifetime    | 700–1,000 ms by profile | Enough to read, not permanent tracking                          |
| Landing keepalive interval    |               8 minutes | Best effort; re-probe on visibility                             |
| Reconnect grace               |               15,000 ms | Existing deployment value                                       |

Intensity bands should also be central. A useful initial ordering is walk 0.25, run 0.55, sonar 0.85, and gunshot 1.0. Decoy uses the walking band. Final Echo is visually strong but should not overwrite the source's local action meter because it is a system reveal, not a chosen action.

Do not expose these raw values as room settings in V3.

## 9. Dependencies and sequencing

The dependency chain is:

1. Characterize Classic and establish mode-safe config/contracts.
2. Build Echo server lifecycle and roster before allowing Echo client routing.
3. Build authoritative actions and public/private events before presentation relies on them.
4. Add client queues/input and a stable arena before polishing HUD effects.
5. Add results/rematch only after elimination and seat reset semantics are stable.
6. Redesign landing and connection readiness around the final create/join mode contract.
7. Tune audio, visuals, and hit feel only after deterministic multiplayer tests pass.
8. Deploy server before client because the protocol changes.

Landing visual work and audio-asset preparation may proceed alongside server logic only after contracts and config names are locked. Do not tune from client-only mocks that disagree with authoritative timing.

Within every phase, add or update the smallest meaningful failing automated test before changing its runtime behavior, implement to green, then rerun the focused Echo tests and the Classic regression subset. A phase is not complete while its listed automated checks fail.

## 10. Implementation phases

### Phase 0 — Freeze the baseline and add Classic regression shields

**Objective**

Protect the working V2/Classic game before introducing mode branches.

**Relevant existing systems/files**

- shared/src/config/gameplayConfig.ts
- shared/src/types/match.ts
- server/src/rooms/InvisiFightRoom.ts
- server/src/services/CombatResolver.ts
- server/src/services/SonarService.ts
- server/tests/roomLifecycle.integration.test.ts
- client/e2e/multiplayer.spec.ts

**Concrete tasks**

1. Record the current successful command baseline in V3 implementation progress when implementation begins.
2. Add characterization assertions for Classic's exact phase sequence, host-only start, 15/3-second timing, two hearts, 165 speed, three-second sonar, shot lock privacy, sequential resolution, replay to lobby, late spectator behavior, and reconnect.
3. Add configuration tests that snapshot or explicitly assert every Classic-critical value.
4. Add a Classic E2E tag/project path so it remains runnable independently after Echo becomes default.
5. Capture public-state key allowlists for Classic before extending the schema.

**Constraints and interactions**

- Tests must describe current behavior, not improve it.
- Arrow-key support, the four-active-fighter cap, restrained shared visual/copy polish, landing/wake fixes, protocol mode, and settings infrastructure are the only planned shared changes.

**Regression risks**

- Accidentally changing Classic by replacing the global config values.
- Routing Classic through the Echo stable-screen lifecycle.
- Altering shot ordering while parameterizing CombatResolver.

**Acceptance criteria**

- Characterization tests fail if Classic health, timings, phase order, host start, privacy, or replay changes.
- Existing 95 tests and 12 browser tests still pass before feature work proceeds.

**Verification**

- Automated: pnpm run ci and the Classic Playwright subset.
- Manual: one two-player Classic loop to confirm the characterization matches visible behavior.

### Phase 1 — Introduce mode-safe configuration, state, and protocol

**Objective**

Create the shared vocabulary for two modes without leaking Echo defaults into Classic.

**Relevant existing systems/files**

- shared/src/config/gameplayConfig.ts
- shared/src/types/match.ts
- shared/src/types/network.ts
- shared/src/index.ts
- server/src/rooms/InvisiFightRoomState.ts
- server/src/rooms/InvisiFightRoomMessages.ts
- client/src/state/matchViewStore.ts
- client/src/network/colyseusClient.ts

**Concrete tasks**

1. Add GameMode, ClassicPhase, EchoPhase, combined MatchPhase, and legal mode-phase helpers.
2. Split common, Classic, and Echo configuration while keeping intentional Classic aliases.
3. Bump protocolVersion from 2 to 3.
4. Add immutable mode to room creation/join filtering, public room state, session-ready payload, session storage, and invite intent.
5. Extend public schema with only the Echo fields needed for countdown, readiness, result summaries, and rivalry totals.
6. Define strict fire, decoy, next-match, private action-status, and public sound-cue contracts.
7. Add running to movement input and rejection enums for wrong mode, phase, cooldown, stale sequence, unavailable decoy, eliminated, and invalid request.
8. Add mode-aware reset helpers and ensure protocol mismatch still produces the existing refresh message.
9. Make session tokens identity-and-room credentials rather than a source of mutable role truth. Prefer removing the unused role field from SessionRecord; otherwise update it atomically whenever a seat/host role changes. All action authorization must read current authoritative room state.

**Constraints and interactions**

- Never add exact active positions to public schema.
- A decoy event must be indistinguishable from a real walking event at the contract level.
- Do not call a public cue “decoy,” include its source ID, or expose true origin.

**Regression risks**

- Colyseus schema defaults accidentally showing Echo state in Classic.
- Old clients connecting to a V3 server without a clean mismatch.
- Manual joins choosing the wrong mode.
- A stale role embedded in a rotated session token restoring the wrong Echo seat.

**Acceptance criteria**

- The server rejects illegal mode/phase/action combinations.
- A room created as one mode cannot change or be joined through the other mode filter.
- Classic values and flows remain identical.
- Public contract review finds no continuous/exact opponent position field.

**Verification**

- Automated shared schema/config tests, server mode creation/join tests, and protocol mismatch tests.
- Manual inspect of one serialized public Echo snapshot and one Classic snapshot.

### Phase 2 — Build Echo seats, practice, countdown, and reset lifecycle

**Objective**

Make the authoritative room move reliably from immediate practice into a fair active match.

**Relevant existing systems/files**

- server/src/rooms/InvisiFightRoom.ts
- server/src/services/RoomAuthService.ts
- server/src/services/MatchClock.ts
- server/src/services/SessionService.ts
- server/src/rooms/InvisiFightRoomState.ts
- server/tests/roomLifecycle.integration.test.ts

**Concrete tasks**

1. Add mode dispatch at create, join, input, simulation, leave, winner, results, and reset boundaries.
2. Enforce the common maximum of four active fighters independently of total room clients, including Classic lobby join and replay-to-lobby reset, then implement Echo-specific seat allocation. Preserve existing participants first and leave overflow clients as spectators.
3. Send the first player into lobby/practice and auto-start a five-second server clock when the second connected active seat arrives.
4. Admit third/fourth players before countdown lock; route later or in-match joins to spectator.
5. Cancel countdown below two connected seats and restart cleanly when the threshold returns.
6. Implement fair two-, three-, and four-player spawn layouts selected at active start, not incremental join-time placement.
7. Atomically reset every match-scoped field at countdown zero.
8. Zero inputs on disconnect, modal/focus-loss messages where applicable, and elimination.
9. Preserve host transfer and signed-session reconnect while separating Echo current-roster membership from host status, legacy role labels, temporary alive state, and next-roster readiness.
10. Define cleanup for empty rooms and winner evaluation after reconnect expiry.

**Constraints and interactions**

- Practice damage/stats/wins are disabled at the server, not merely hidden by the client.
- Countdown actions are harmless and cannot affect the spawn reset.
- Do not promote Echo spectators without an explicit next-match opt-in.
- Keep Classic's current role/reset code path separate.

**Regression risks**

- Match beginning with stale practice cooldown or decoy state.
- Third/fourth player spawn unfairness.
- Eliminated players losing rematch identity.
- A transient disconnect awarding an immediate win instead of honoring grace.

**Acceptance criteria**

- One player can practice indefinitely.
- The second connected seat starts exactly one five-second countdown.
- Dropping to one cancels it; returning to two starts a fresh countdown.
- At zero, two-to-four fighters have valid separated spawns, three hearts, ready actions, zero stale input, and no practice stats.
- Fifth join and active-match joins spectate without private position data; a Classic replay cannot promote overflow beyond four.

**Verification**

- Automated fake-clock room integration tests for all threshold, join, leave, and reset paths.
- Manual two-browser practice-to-countdown observation.

### Phase 3 — Add authoritative Echo movement sound, running, and decoy

**Objective**

Create the main information game: readable, approximate, full-arena sound trails and one deceptive walking trail.

**Relevant existing systems/files**

- server/src/rooms/InvisiFightRoom.ts
- new server/src/services/EchoSoundService.ts
- server/src/services/InputRateLimiter.ts
- shared/src/utils/geometry.ts
- shared/src/types/network.ts
- client/src/game/input/KeyboardMovementController.ts

**Concrete tasks**

1. Apply Echo walk/run speeds from sanitized movement plus running intent.
2. Generate footsteps from authoritative actual displacement and cadence; no displacement means no step.
3. Implement injected, bounded random position offsets by walk/run profile and arena clamping.
4. Broadcast every cue to every client without a range filter.
5. Add right-click decoy validation, one-use state, authoritative direction/path, scheduled walking cues, and practice reuse.
6. Make public real-walk and decoy-walk payloads structurally and visually identical.
7. Add private action acknowledgements and reconnect restoration.
8. Track server-only emitted-sound contribution for results.
9. Add WASD, arrow, and Shift handling with blur/modal/input-field safety.

**Constraints and interactions**

- Do not emit based on client keydown count.
- Do not reveal a player ID or true origin in public footstep events or logs delivered to clients.
- Audio panning may use only approximate coordinates.
- Decoy scheduled callbacks must be canceled on match reset, leave, disposal, or mode transition.

**Regression risks**

- Footstep spam while pressing into a boundary.
- Event averaging becoming too exact.
- Decoy flags leaking through type names, analytics, debug UI, or wire data.
- Right-click blocking the landing page or browser globally.

**Acceptance criteria**

- Walk and run cadence/intensity are visibly and audibly distinct.
- Every client receives cues from across the map.
- Sampled cues remain within configured variance and arena bounds.
- Decoy consumes once in active play, reuses in practice, travels toward aim, and is indistinguishable on the public wire.
- Classic movement speed and phases do not change; arrows work.

**Verification**

- Automated deterministic service tests with seeded/injected RNG, boundary cases, cadence, no-motion cases, broadcast recipient count, decoy parity, sequence rejection, and reset.
- Manual two-player blind tracking test from opposite corners.

### Phase 4 — Add real-time shooting, sonar policy, Final Echo, stats, and winner flow

**Objective**

Complete the authoritative Echo match loop and its risk/reward decisions.

**Relevant existing systems/files**

- server/src/services/CombatResolver.ts
- server/src/services/SonarService.ts
- server/src/rooms/InvisiFightRoom.ts
- shared/src/utils/geometry.ts
- new server Echo lifecycle/stats services
- server/tests/combatResolver.test.ts
- server/tests/sonarService.test.ts
- server/tests/roomLifecycle.integration.test.ts

**Concrete tasks**

1. Parameterize or wrap combat geometry for Echo's body/hit radii while retaining Classic defaults.
2. Validate immediate fire messages and enforce per-player server cooldown.
3. Resolve from authoritative origin in receipt order; damage nearest living intersection by one heart.
4. Broadcast accepted shot origin/tracer/result plus prediction correlation and private cooldown status; reject invalid/repeated fire without side effects.
5. Make practice/countdown shots visible and audible but non-damaging and non-statistical.
6. Configure Echo sonar for allowed Echo states and six-second active cooldown while preserving Classic's three seconds.
7. Enter Final Echo at 75 seconds and generate anonymous approximate cues for each living fighter every 2.5 seconds.
8. End at one living fighter, delay results only long enough to render the final impact, then publish winner, stats, awards, and room-local win totals.
9. Track damage, accepted shots, hits, accuracy, sonar detections, emitted-sound score, closest miss distance, eliminations, and survival. Compute awards only at results.
10. Handle departures and zero-living edge cases without inventing a draw timer.

**Constraints and interactions**

- Client timestamps never decide shot order.
- Predicted effects never change health.
- Stats remain server-only until results so they do not leak hidden behavior.
- Final Echo reveals approximate points only.
- Classic FiringOrderService and phase resolution stay untouched.

**Regression risks**

- A global hit-radius change making Classic easier.
- Unlimited fire bypassing cooldown after refresh.
- Last-shot event loss during bursts.
- Results revealing private coordinates or stats before match end.

**Acceptance criteria**

- Three hits eliminate an Echo fighter.
- Unlimited sequential shots work, but faster-than-cooldown requests are rejected.
- Gunfire creates a strong exact momentary reveal and no ongoing position stream.
- Sonar works throughout Echo active states with the Echo cooldown.
- Final Echo begins once, continues until a winner, and stops/reset cleanly.
- Two-, three-, and four-player winner logic is correct.

**Verification**

- Automated combat/cooldown/receipt-order tests, sonar mode tests, fake-clock Final Echo tests, FFA nearest-hit tests, stat calculations, and full room lifecycle tests.
- Manual latency-throttled 1v1 and one three-player FFA.

### Phase 5 — Add client action routing, event queues, audio, and Echo renderer feedback

**Objective**

Render the authoritative loop responsively without losing events or privacy.

**Relevant existing systems/files**

- client/src/network/colyseusClient.ts
- client/src/state/matchViewStore.ts
- client/src/state/privateSnapshotStore.ts
- client/src/game-three/ThreeGame.ts
- client/src/game-three/renderers/ShotEffects.ts
- client/src/game-three/renderers/SonarRenderer.ts
- client/src/game-three/renderers/FighterRenderer.ts
- client/src/game-three/models/FighterModel.ts
- client/src/game-three/camera/CameraController.ts
- client/src/audio

**Concrete tasks**

1. Add mode-aware sendFire, sendDecoy, sendNextMatch, and running input.
2. Route private readiness/status messages to private state and public sound/shot events to bounded queues.
3. Preserve lastShot compatibility for Classic.
4. Build world sound markers with profile-specific scale, opacity, lifetime, and approximate coordinate.
5. Create or curate licensed game-owned walk, run, hit, miss, and ambient assets under client/src/assets/audio, record their provenance, normalize their perceived levels, and play pooled walk/run/decoy/sonar/gunshot/hit/miss SFX through the central settings-aware audio manager. Add one restrained looping ambient music bed controlled by the Music level.
6. Add Echo fighter scale and matching presentation profile without changing Classic.
7. Add predicted local muzzle/kick and authoritative tracer, impact, hit marker, victim response, health animation, elimination, and visual-only hit-stop. Reconcile by request sequence so the local shot sound and flash play once.
8. Ensure queued events survive ordinary state patches but clear at authoritative reset.
9. Disable active input for eliminated/spectator clients while retaining camera and public event rendering.
10. Ensure renderer disposal removes pointer, contextmenu, keyboard, resize, store, audio, and animation listeners.

**Constraints and interactions**

- Use serverClock for event lifetimes.
- Do not show opponent models from continuous public state in Echo.
- No public event may be enriched with a private store position.
- Arena remains fully framed during camera effects.

**Regression risks**

- Multiple real-time shots collapsing into lastShot.
- Local predictions displaying false hits or double-playing an accepted shot.
- Audio overlap cutting off cues.
- renderer/listener leaks across routes.

**Acceptance criteria**

- A burst of interleaved footstep and shot events renders once each in stable order.
- A local click feels immediate while authoritative result remains visibly distinct.
- Hit, miss, elimination, sonar, walk, and run are recognizable without explanatory text.
- Spectators receive only public visuals.
- Classic renderer output remains unchanged.

**Verification**

- Automated queue/dedupe/prune tests, renderer-system tests, audio mixer tests, disposal tests, and privacy selector tests.
- Manual headphones, speakers, muted audio, low volume, and rapid FFA event tests.

### Phase 6 — Build the stable full-screen Echo UI, sound meter, and settings

**Objective**

Turn the new mechanics into a compact, ergonomic game surface.

**Relevant existing systems/files**

- client/src/app/App.ts
- client/src/app/Router.ts
- client/src/app/screens/mountArena.ts
- current MatchScreen, SpectatorScreen, and ResultsScreen
- client/src/components/hud
- client/src/styles/design-tokens.css
- client/src/styles/global.css
- client/src/state/uiStore.ts

**Concrete tasks**

1. Add EchoArenaScreen and keep its renderer mounted from practice through results.
2. Implement the bottom overlay contents defined in section 4.12.
3. Drive the sound meter from local emitted-action events with profile peaks and time decay.
4. Add brief centered, non-card announcements for the five-second countdown, Final Echo, and hit/elimination feedback. Keep waiting, reconnection controls, and the expandable results surface in the bottom overlay.
5. Render three hearts and smooth authoritative health changes.
6. Add decoy available/used and sonar cooldown/readiness without an ammo display or player ring.
7. Add room invite, connection status, leave, fullscreen, and settings without expanding into a dashboard.
8. Implement versioned local settings and route existing Classic audio through volume controls.
9. Apply responsive full-viewport CSS, safe-area behavior, focus states, and non-color-only status labels.
10. Scope Echo layout selectors so they cannot restructure Classic. Apply shared design-token and copy cleanup to Classic deliberately, with visual regressions checked separately.

**Constraints and interactions**

- Store subscriptions should update small regions or a stable screen, not remount WebGL.
- Avoid large opaque overlays that hide sound cues.
- No hidden focus or global keyboard capture while settings/results controls are open.

**Regression risks**

- App.render replacing EchoArenaScreen on every store change.
- Overlay pointer events preventing aim/fire outside actual controls.
- shared CSS changing Classic dimensions.
- settings hydration causing audio spikes.

**Acceptance criteria**

- Echo uses one canvas instance throughout a complete match/rematch.
- All required information fits at the bottom at common desktop widths.
- The arena and every sound marker remain visible.
- Keyboard and mouse controls pause correctly around overlays.
- No ammo/reload UI exists.

**Verification**

- Automated DOM tests for screen stability, overlay state, focus, sound-meter mapping, settings persistence, and fullscreen failure.
- Manual visual QA at 1920x1080, 1440x900, 1366x768, and a narrow supported desktop window.

### Phase 7 — Redesign landing, add attract simulation, modal, invites, and readiness service

**Objective**

Deliver a polished entry flow and fix the false “waking server” architecture.

**Relevant existing systems/files**

- client/src/app/screens/LandingScreen.ts
- client/src/app/screens/ConnectingScreen.ts
- client/src/app/Router.ts
- client/src/main.ts
- client/src/network/ServerWakeService.ts
- client/src/network/colyseusClient.ts
- client/src/state/connectionStore.ts
- server/src/app.ts
- render.yaml
- client/vite.config.ts
- RPS reference files named in section 4.1

**Concrete tasks**

1. Replace the card-heavy landing composition with the minimal hierarchy specified above.
2. Add the isolated two-fighter attract simulation and lifecycle cleanup.
3. Add mode selection, mode-aware Create/Join, query parsing, URL generation, and clipboard fallback.
4. Stage valid form intent in the controls modal; make X initialize audio and begin exactly one network action.
5. Replace blocking wake logic with ServerAvailabilityService and app/screen lifecycle ownership.
6. Warm immediately, keep the interval owned while the landing screen is mounted, and probe on visibility regain.
7. Attempt Colyseus even when health fetch rejects or times out.
8. Separate health-probe state from actual connection state and rewrite ConnectingScreen copy.
9. Preserve signed-session automatic reconnect and GitHub Pages 404 fallback/base-path handling.
10. Add request correlation and useful non-sensitive logs for health timing, matchmaker timing, transport open/failure, browser visibility, and final classification. Do not log tokens or exact hidden positions.

**Constraints and interactions**

- Do not start network room creation behind the modal.
- Do not instantiate multiple keepalive intervals after App rerenders.
- Do not automatically retry ambiguous room creation.
- Landing animation and keepalive are separate services.

**Regression risks**

- Duplicate rooms from double submit/retry.
- Invite paths breaking under the GitHub Pages repository base.
- Brave health rejection still blocking transport.
- hidden-tab timers falsely promising permanent uptime.

**Acceptance criteria**

- A mocked rejected health fetch followed by successful Colyseus transport enters the room and never gets stuck on “waking.”
- An awake server joins promptly; a slow server shows truthful progressive copy.
- One landing page owns one probe and one interval.
- Invite links prefill code/mode correctly under local and production base paths.
- The modal blocks room entry until X and no countdown begins before then.
- Landing stays simple, responsive, muted, and keyboard accessible.

**Verification**

- Automated ServerAvailabilityService tests with success, abort, CORS-style rejection, non-OK, deduplication, interval, visibility, cleanup, and successful transport-after-probe-failure.
- Landing/modal/router DOM tests and Playwright create/join/invite tests.
- Manual Chrome and Brave diagnostics from the browser/network matrix.

### Phase 8 — Finish results, next-match seating, reconnect, and spectators

**Objective**

Make repeated rooms reliable and keep every role within privacy boundaries.

**Relevant existing systems/files**

- server/src/rooms/InvisiFightRoom.ts
- server/src/services/RoomAuthService.ts
- server/src/services/SessionService.ts
- client/src/network/reconnectPolicy.ts
- client/src/app EchoArenaScreen
- client/src/state/sessionStore.ts
- client/src/state/privateSnapshotStore.ts

**Concrete tasks**

1. Implement results-stage opt-in, at-most-four reservation order, public ready state, and automatic five-second rematch countdown.
2. Preserve every client's room identity and rivalry total, accept participant and spectator opt-ins in authoritative request order, and leave non-ready clients spectating.
3. Reset every match-scoped field at rematch start while retaining room-local rivalry totals and identity.
4. Restore all private action readiness and seat/alive state on reconnect from current room state, never from a stale role claim in the session token.
5. Handle leave/disconnect during results and countdown without deadlocks or phantom seats.
6. Keep host transfer visible but non-authoritative for Echo start.
7. Ensure eliminated participants can ready without role mutation and late spectators cannot act before admission.
8. Add concise results stats and award selection with deterministic tie handling.

**Constraints and interactions**

- A client cannot reserve multiple seats through repeated sequences or reconnect.
- Results contain no exact position history.
- Classic replay remains replay-to-lobby.

**Regression risks**

- Spectators accidentally receiving private state.
- decoy/cooldown replenishment on reconnect.
- rivalry score clearing on match reset or persisting after room disposal.
- a non-ready old participant blocking all rematches.

**Acceptance criteria**

- Two clients can replay repeatedly without leaving the arena.
- A spectator can opt into a free next-match seat.
- More than four ready requests never create more than four fighters.
- Disconnect/leave updates readiness and countdown correctly.
- Classic replay still returns its existing roster to lobby, and a fifth Classic lobby join remains a spectator.

**Verification**

- Automated integration matrix for participants/spectators ready ordering, reconnect, departure, host transfer, reset, and score.
- Manual three-browser match with one late spectator joining the next round.

### Phase 9 — Polish, tune, validate, and release

**Objective**

Turn mechanically complete V3 into a release-quality build without expanding scope.

**Relevant existing systems/files**

- all changed packages
- client/e2e
- playwright.config.ts
- .github/workflows
- render.yaml
- V3 implementation progress/evidence created during execution

**Concrete tasks**

1. Run focused 1v1 tuning sessions for speed, step cadence/jitter, hit radius, fire cooldown, sonar cooldown, decoy trail, cue lifetime, health, and Final Echo timing.
2. Verify three/four-player FFA event density and performance; change only central tuning values.
3. Perform visual and audio QA, including mono/mute, overlapping cues, reduced-motion OS preference, and fullscreen.
4. Expand Playwright Echo coverage while retaining the complete Classic suite.
5. Run the browser/network matrix below on local and deployed builds.
6. Run security/privacy inspection against public state, all public events, reconnect, spectator, and browser DevTools payloads.
7. Deploy the V3 server first, confirm health build SHA and protocol, then deploy the client from the same intended commit.
8. Compare deployed client commit and Render health SHA before calling V3 live.
9. Record separate evidence for automated local pass, manual browser pass, Brave/device pass, and live deployment. Do not infer one from another.

**Constraints and interactions**

- Tuning does not justify adding new mechanics.
- A successful build is not live-deployment proof.
- A Playwright Chromium pass is not an actual Brave/device pass.

**Regression risks**

- shipping protocol mismatch during deployment order
- treating a local visual check as cross-device proof
- removing Classic tests to shorten CI
- hiding a privacy leak behind presentation

**Acceptance criteria**

- Every phase's acceptance criteria passes.
- Core 1v1 playtesters can intentionally track, deceive, shoot, and explain why they were found.
- FFA remains functional and readable even if not equally optimized.
- Chrome and Brave can join the same already-awake live server without false waking.
- Classic remains behaviorally unchanged except the explicitly shared improvements.

**Verification**

- Automated: pnpm run ci, full Playwright suite, production builds, and deployment health checks.
- Manual: full regression checklist and browser/network matrix.

## 11. Testing strategy

### Core gameplay logic

- Config separation: Classic values cannot read Echo defaults accidentally.
- Movement: normalization, walk/run speed, boundary clamp, focus reset, and no boundary step spam.
- Sound: cadence, jitter distribution bounds, arena clamp, all-recipient broadcast, IDs/timestamps, expiry, and no true/source fields.
- Decoy: direction, travel, edge clipping, public parity with walk, exactly one use, practice reuse, stale sequence, and reset/reconnect.
- Combat: authoritative origin, nearest-hit ray, larger Echo radius, three hearts, cooldown, unlimited long-run firing, eliminated rejection, and receipt order.
- Sonar: Echo/Classic cooldowns, full-arena detection, public/private routing, reset, and allowed phases.
- Final Echo: transition once, interval, one event per living fighter, approximate-only payloads, stop on results/reset.
- Stats: damage, hits, accuracy, detections, loudness, closest miss, awards, ties, and room-local score.

### Multiplayer synchronization and lifecycle

Use fake clocks and real Colyseus integration clients for:

- create Echo -> one-player practice
- second join -> five-second countdown
- countdown cancel/restart
- third/fourth pre-start joins
- fifth and active-match joins as spectators
- active reset from dirty practice state
- real-time movement/fire/sonar/decoy from multiple clients
- elimination and FFA winner
- 75-second Final Echo path
- results -> two ready -> countdown -> clean rematch
- spectator next-seat opt-in
- deliberate leave and reconnect-grace expiry
- host transfer
- zero/one-player edge states

### Input mappings

- WASD and arrow keys produce identical normalized vectors.
- ShiftLeft and ShiftRight set running only while held.
- Space triggers sonar once per press and respects focused controls.
- Left-click fires once per click and does not auto-fire while held.
- Right-click requests decoy and prevents context menu only over the active Echo arena.
- Blur, visibility, modal, and input focus clear held keys/buttons.
- Classic arrows work while Shift and right-click have no Classic gameplay effect.

### Hidden-information and security tests

- Maintain explicit public-state key allowlists by mode.
- Assert no exact active opponent position/velocity/aim enters Echo public schema.
- Assert movement and decoy public events share the same permitted keys.
- Assert no decoy discriminator/source identity appears in event serialization.
- Assert approximate cues remain within intended bounds but are not true-position passthrough.
- Assert spectator and eliminated clients receive no private player state, sonar snapshots, or action status.
- Assert one client never applies another client's private state.
- Inspect public logs and errors for session tokens or exact hidden coordinates.
- Verify the accepted shot's origin and tracer/impact are the only intentional exact momentary public position reveals.

### Default mode versus Classic regression

- Primary create/join defaults to Echo.
- Explicit Classic creates a Classic room and uses the existing lobby.
- Run all current Classic integration and E2E scenarios unchanged.
- Assert Classic two hearts, 15-second Hunt, three-second Commit, three-second sonar, original radii/speed, firing order, recap, host start, replay-to-lobby, and at most four active fighters.
- Assert Echo CSS/profile does not alter Classic model scale or camera.
- Assert shared volume/wake/arrow changes do not alter Classic authority or privacy.

### Server wake and readiness

- Immediate probe success/non-OK/rejection/timeout.
- One in-flight probe shared by multiple callers.
- One interval per landing ownership and complete cleanup.
- visibility return probe.
- health rejected while Colyseus create/join succeeds.
- health succeeds while Colyseus fails: UI reports connection failure, not success.
- slow real connection produces truthful copy.
- double click does not create two in-flight rooms.
- ambiguous create failure has no automatic duplicate retry.
- reconnect continues even if health is blocked.

### UI and visual behavior

- Controls modal appears before intentional network calls and has correct mode copy.
- Stable Echo canvas identity through every phase.
- Bottom overlay content by phase/role.
- No ammo or reload UI.
- Three-heart display and sound-meter color/value transitions.
- Invite parsing/copy fallback under GitHub Pages base path.
- Settings persist and failure modes remain usable.
- Focus order, keyboard activation, aria labels, contrast, narrow-width overflow, and safe areas.
- Landing simulation is noninteractive, muted, paused/cleaned, and deterministic.

### Existing repository gates

Run:

1. pnpm lint
2. pnpm typecheck
3. pnpm test
4. pnpm build
5. pnpm run test:e2e

pnpm run ci combines the first four. Keep the current three Playwright engines. Add focused Echo tests so a full multi-engine run remains practical; use a larger Chromium integration set plus at least one complete Echo and Classic loop on Firefox and WebKit.

### Manual-only validation

Automation cannot adequately decide:

- whether approximate cues are useful without being exact
- whether running's risk is worth its speed
- whether one decoy fools players without feeling random
- whether fire cooldown and hit radius feel deliberate/fair
- whether Final Echo begins at the right time
- whether sound categories remain distinct during FFA overlap
- whether camera kick/hit-stop add clarity without discomfort
- whether the landing/UI feels restrained and readable
- actual Brave Shields/device behavior
- real Render cold-start and already-awake behavior

Record these as separate manual evidence rather than converting impressions into unverified automated claims.

## 12. Browser and network test matrix

| ID  | Clients and browsers                             | Server state                               | Scenario                       | Expected result                                                                                          |
| --- | ------------------------------------------------ | ------------------------------------------ | ------------------------------ | -------------------------------------------------------------------------------------------------------- |
| B1  | One Chrome profile                               | cold/sleeping                              | Open landing and wait          | Immediate advisory probe begins; landing remains usable; no room created                                 |
| B2  | One Chrome profile                               | awake                                      | Create Echo                    | Modal precedes request; connection is prompt; player enters practice                                     |
| B3  | Chrome plus Chrome incognito                     | awake                                      | Second joins by invite         | Correct mode/code; five-second countdown once; both reset into 1v1                                       |
| B4  | Chrome host plus Brave on another device/profile | already awake through Chrome               | Brave opens landing and joins  | Brave never remains falsely on waking; actual room transport decides success                             |
| B5  | Brave alone                                      | cold/sleeping                              | Open landing, then create      | Probe may be blocked; actual connection still attempts; truthful slow/failure copy                       |
| B6  | One Chrome tab                                   | wake in progress                           | Create is double-activated     | Exactly one in-flight create operation; one room or one actionable failure, never an automatic duplicate |
| B7  | Chrome plus Firefox                              | awake                                      | Full Echo match and rematch    | Events, damage, result, readiness, and reset stay synchronized                                           |
| B8  | Four independent browser contexts                | awake                                      | 4-player FFA                   | Exactly four active seats, readable event burst, one winner                                              |
| B9  | Four players plus fifth browser                  | awake/active match                         | Fifth joins                    | Fifth is read-only spectator and receives no private state                                               |
| B10 | Two browsers                                     | active match                               | Refresh one                    | Reconnect within grace restores exact own/action state and does not replenish decoy                      |
| B11 | Two browsers                                     | countdown                                  | One disconnects                | Countdown cancels below two; a later reconnect can start a fresh countdown                               |
| B12 | Three browsers                                   | results                                    | Spectator opts into next match | At most four seats, visible readiness, clean five-second rematch                                         |
| B13 | Chrome and Brave                                 | landing for longer than keepalive interval | server initially awake         | Only one periodic probe per page; visibility return probes; no room creation                             |
| B14 | Chromium, Firefox, WebKit Playwright             | local awake                                | Existing Classic suite         | All current Classic behavior passes                                                                      |
| B15 | Chrome and Brave                                 | deployed server/client                     | Same-room end-to-end           | Production URLs/CORS/WebSocket/build SHAs verified; no false wake state                                  |
| B16 | One browser with health fetch mocked/rejected    | local server awake                         | Create and join                | Actual Colyseus success bypasses advisory probe failure                                                  |

For B4, B5, B13, and B15 capture:

- browser/version and Brave Shields setting
- device/network
- health request result or browser error
- matchmaker request result
- WebSocket handshake result
- UI status sequence
- deployed client commit and server health build SHA

Do not include session tokens in captured evidence.

## 13. Final regression checklist

### Spec and scope

- [ ] Echo Hunt is the default; Classic is explicitly secondary.
- [ ] No superseded three-bullet, reload, magazine, or reload-audio behavior exists.
- [ ] No distance-based sound filtering exists.
- [ ] No bot, cover, floor material, new weapon, or unrequested setting was added.
- [ ] All tuning values are centralized and Classic/Echo values are separate.

### Landing and entry

- [ ] Landing is minimal and the two-fighter simulation is muted/noninteractive.
- [ ] Simulation pauses/cleans up and does not instantiate networking/game stores.
- [ ] Echo and Classic create/join intent is unambiguous.
- [ ] Invite URL parses correctly under the Pages base path.
- [ ] Controls modal appears before intentional create/join network activity.
- [ ] X is keyboard accessible, unlocks audio, and starts exactly one operation.

### Availability and connection

- [ ] Landing sends immediate and periodic deduplicated health probes.
- [ ] Visibility return triggers a probe and leaving landing clears interval/listeners.
- [ ] Health failure cannot block create, join, or reconnect.
- [ ] UI never equates every fetch error with a sleeping server.
- [ ] Double submit and ambiguous failure do not create automatic duplicates.
- [ ] Chrome/Brave already-awake scenario passes on real browsers/devices.
- [ ] Connection, reconnect, and failure copy matches observed state.

### Practice and lifecycle

- [ ] First Echo player enters harmless arena practice.
- [ ] Practice actions do not damage, eliminate, score, or consume match decoy.
- [ ] Second connected seat starts one five-second server countdown.
- [ ] Countdown cancels below two and resets cleanly.
- [ ] Match start resets positions, health, inputs, cooldowns, decoy, effects, stats, and winner.
- [ ] Two-, three-, and four-player spawns are separated/fair.
- [ ] Active match enters Final Echo after the configured window and ends only with a winner/departure resolution.

### Movement, sound, and decoy

- [ ] WASD and arrows work; Shift walking/running behavior is correct.
- [ ] Diagonals normalize and blur/modal/input focus clears movement.
- [ ] Walk is faint/sparse; run is louder/frequent.
- [ ] Footsteps derive from authoritative displacement and do not spam at walls.
- [ ] Every sound reaches every room client at any arena distance.
- [ ] Approximate positions use server variance, stay in bounds, and do not expose true values.
- [ ] Sound meter reflects local emitted risk and blends green/yellow/red.
- [ ] Right-click works only in Echo arena and normal context menus work elsewhere.
- [ ] Active decoy works once, moves toward cursor, and is wire/visual/audio-identical to walking.
- [ ] Decoy reset/reconnect behavior cannot grant extra uses.

### Combat and sonar

- [ ] Ammo is unlimited, each shot needs a click, and cooldown is server authoritative.
- [ ] Origin is server authoritative; client cannot declare position/hit.
- [ ] Echo model/hitbox are larger without altering Classic.
- [ ] Three hits eliminate at full Echo health.
- [ ] Nearest intersecting living fighter takes one damage; shot does not pierce.
- [ ] Fire prediction is presentation-only, reconciles once, and the server result controls damage.
- [ ] Muzzle, tracer, kick, hit/miss, health, hit-stop, and elimination are readable.
- [ ] Sonar uses Echo cooldown/full arena and private/public routing correctly.
- [ ] No persistent sonar status ring is attached to the fighter.
- [ ] Echo never displays the Classic active-shooter ring.

### HUD, results, and replay

- [ ] Echo canvas fills viewport and remains the same instance through the full loop.
- [ ] Entire arena remains framed and bottom overlays do not hide important cues.
- [ ] HUD includes hearts, local sound, sonar, decoy, state/timer, room, and connection.
- [ ] HUD has no ammo/reload indicator.
- [ ] Results show concise winner/stats/awards/rivalry/readiness.
- [ ] Two ready clients start a rematch countdown without returning to a separate lobby.
- [ ] Spectators can request a free next-match seat; roster never exceeds four.
- [ ] Room-local score persists between matches and clears with room disposal.

### Roles, reconnect, and privacy

- [ ] Active seats are capped at four separately from room client count in both modes.
- [ ] Late joins spectate and receive no private state.
- [ ] Eliminated players spectate without losing rematch identity.
- [ ] Disconnect freezes movement and honors reconnect grace.
- [ ] Reconnect restores position, health, role/seat, cooldowns, decoy, and readiness.
- [ ] Host transfer works and grants no Echo start advantage.
- [ ] Public state/events contain no exact continuous opponent position/velocity/aim.
- [ ] Decoy has no public discriminator/source leak.
- [ ] Accepted shot origin and tracer/impact are the only intentional exact momentary position reveals.
- [ ] Private sonar and action status reach only their owner.

### Settings, compatibility, and release

- [ ] Master/Music/SFX settings persist; fullscreen fails gracefully.
- [ ] Audio-blocked, muted, mono, and disabled-test modes remain playable.
- [ ] Operating system reduced-motion preference is respected without a new setting.
- [ ] Classic exact phases, values, privacy, host start, firing, recap, and replay pass.
- [ ] Classic arrow support and shared landing/wake/settings changes do not alter gameplay.
- [ ] Shared visual polish removes needless copy without routing Echo HUD/layout into Classic.
- [ ] Phaser remains a Classic fallback; Echo uses Three.js.
- [ ] pnpm run ci passes.
- [ ] Full Playwright suite passes Chromium, Firefox, and WebKit.
- [ ] Manual 1v1, FFA, spectator, reconnect, Chrome, Brave, cold, and awake checks are recorded.
- [ ] Server is deployed before client for protocol V3.
- [ ] Live client commit and health build SHA match the intended release.

## 14. Second-pass audit record

Before implementation begins, a fresh agent should treat the following as deliberate reconciliations rather than open questions:

- Three bullets and reload were removed after being proposed. Unlimited ammo is final.
- Full-arena hearing replaced any range concept.
- Approximation is mandatory for movement/Final Echo; a shot's exact muzzle origin and tracer/impact are intentional momentary exceptions that create feedback and firing risk.
- The decoy is one active-match use and must look like walking, not a generic noise icon.
- The user rejected a solo bot, not the harmless waiting practice arena.
- “No sonar ring” removes player-attached status UI, not the accepted transient activation wave.
- Fullscreen means a viewport-filling canvas with the whole arena still visible, not zoom-cropping.
- Echo elimination is a read-only state, not a destructive role conversion.
- Classic remains unchanged through separate config and lifecycle branches; shared changes are limited and enumerated.
- The health probe is advisory; it cannot truthfully prove that a server is asleep when browser policy blocks it.

No unresolved product decision blocks implementation. The exact final values for cue variance, fire cadence, hit radius, and effect duration are tuning decisions, and the exact Brave trigger still requires live reproduction. Neither changes the architecture defined here.
