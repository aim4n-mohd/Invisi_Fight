import { Client as ColyseusClient } from 'colyseus.js';
import type { Room } from 'colyseus.js';
import {
  GAMEPLAY_CONFIG,
  type ErrorEvent,
  type MatchPhase,
  type PlayerInputMessage,
  type PlayerRole,
  type PrivatePlayerStateEvent,
  type PrivateSonarSnapshotEvent,
  type PublicPlayerState,
  type SessionReadyEvent,
  type ShotResolutionEvent,
} from '@invisi-fight/shared';
import { CLIENT_CONFIG } from '../config/clientConfig.js';
import { reconnectWithReservationRetry } from './reconnectPolicy.js';
import { ServerWakeError, ServerWakeService } from './ServerWakeService.js';
import { connectionStore } from '../state/connectionStore.js';
import { matchViewStore } from '../state/matchViewStore.js';
import { privateSnapshotStore } from '../state/privateSnapshotStore.js';
import { sessionStore } from '../state/sessionStore.js';
import { uiStore } from '../state/uiStore.js';

interface PublicPlayerWireState {
  playerId: string;
  displayName: string;
  role: PlayerRole;
  hearts: number;
  connected: boolean;
  alive: boolean;
  isHost: boolean;
  revealedX: number;
  revealedY: number;
  lockedAimAngleRad: number;
}

interface PlayerMapWireState {
  forEach: (callback: (player: PublicPlayerWireState, playerId: string) => void) => void;
}

interface RoomWireState {
  protocolVersion: number;
  revision: number;
  roomCode: string;
  phase: MatchPhase;
  phaseStartedAtServerMs: number;
  phaseEndsAtServerMs: number;
  roundNumber: number;
  activeShooterId: string;
  winnerPlayerId: string;
  firingOrder: Iterable<string>;
  players: PlayerMapWireState;
}

const ROOM_NAME = 'invisi_fight';

function errorMessage(error: unknown): string {
  if (error instanceof ServerWakeError) return error.message;
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes('no rooms found') || message.includes('could not be found')) {
      return 'That room code could not be found. Check the code and try again.';
    }
    if (message.includes('name') && message.includes('invalid')) {
      return 'That display name is not available in this room.';
    }
  }
  return 'The multiplayer server could not be reached. Please try again.';
}

export class InvisiFightClient {
  readonly #client = new ColyseusClient(CLIENT_CONFIG.serverWsUrl);
  readonly #wakeService = new ServerWakeService(CLIENT_CONFIG.serverHttpUrl);
  #room: Room<RoomWireState> | null = null;
  #reconnectPromise: Promise<void> | null = null;
  #pageClosing = false;

  get room(): Room<RoomWireState> | null {
    return this.#room;
  }

  prepareForPageClose(): void {
    if (this.#pageClosing) return;
    this.#pageClosing = true;
    if (this.#room?.connection.isOpen) void this.#room.leave(false);
  }

  async createRoom(playerName: string): Promise<void> {
    await this.#connect('create', playerName);
  }

  async joinRoom(playerName: string, roomCode: string): Promise<void> {
    await this.#connect('join', playerName, roomCode.trim().toUpperCase());
  }

  async reconnect(reconnectToken: string): Promise<void> {
    if (this.#reconnectPromise) return this.#reconnectPromise;
    this.#reconnectPromise = this.#performReconnect(reconnectToken).finally(() => {
      this.#reconnectPromise = null;
    });
    return this.#reconnectPromise;
  }

  async #performReconnect(reconnectToken: string): Promise<void> {
    connectionStore.getState().setStatus('reconnecting', 0);
    uiStore.getState().setScreen('connecting');
    uiStore.getState().setBusy(true, 'Reconnecting to room…');
    try {
      await this.#waitForServer('reconnecting');
      const room = await reconnectWithReservationRetry(() =>
        this.#client.reconnect<RoomWireState>(reconnectToken),
      );
      this.#attachRoom(room);
    } catch (error) {
      sessionStore.getState().clearRoomSession();
      connectionStore.getState().setStatus('error');
      uiStore.getState().setScreen('landing');
      uiStore
        .getState()
        .setError(
          error instanceof Error && error.name === 'ServerWakeError'
            ? error.message
            : 'That room is no longer available. Create a new room or join again.',
        );
      throw error;
    }
  }

  sendInput(input: PlayerInputMessage): void {
    if (!this.#room || connectionStore.getState().status !== 'connected') return;
    this.#room.send('input:player', input);
  }

  startMatch(): void {
    const token = sessionStore.getState().roomSession?.sessionToken;
    if (!this.#room || !token) return;
    this.#room.send('input:start', { sessionToken: token });
  }

  replayToLobby(): void {
    const token = sessionStore.getState().roomSession?.sessionToken;
    if (!this.#room || !token) return;
    this.#room.send('input:replay', { sessionToken: token });
  }

  async leave(): Promise<void> {
    if (this.#room) await this.#room.leave(true);
    this.#room = null;
    sessionStore.getState().clearRoomSession();
    connectionStore.getState().clear();
    matchViewStore.getState().reset();
    privateSnapshotStore.getState().reset();
    uiStore.getState().setScreen('landing');
  }

  async #connect(mode: 'create' | 'join', playerName: string, roomCode?: string): Promise<void> {
    connectionStore.getState().setStatus('connecting');
    uiStore.getState().setScreen('connecting');
    uiStore.getState().setBusy(true, 'Connecting to multiplayer server…');
    try {
      await this.#waitForServer('connecting');
      const sessionToken = sessionStore.getState().roomSession?.sessionToken;
      const options = { playerName, roomCode, sessionToken };
      const room =
        mode === 'create'
          ? await this.#client.create<RoomWireState>(ROOM_NAME, { playerName })
          : await this.#client.join<RoomWireState>(ROOM_NAME, options);
      this.#attachRoom(room);
    } catch (error) {
      connectionStore.getState().setStatus('error');
      uiStore.getState().setScreen('landing');
      uiStore.getState().setError(errorMessage(error));
      throw error;
    }
  }

  #attachRoom(room: Room<RoomWireState>): void {
    this.#room = room;
    connectionStore.getState().setStatus('connected');
    uiStore.getState().setBusy(false);

    room.onStateChange((state) => this.#applyState(state));
    room.onMessage<SessionReadyEvent>('session:ready', (event) => {
      const reconnectToken = room.reconnectionToken;
      sessionStore.getState().setRoomSession({
        playerId: event.playerId,
        sessionToken: event.sessionToken,
        reconnectToken,
        roomId: event.roomId,
        roomCode: event.roomCode,
      });
      connectionStore.getState().setRoom(event.roomId, event.roomCode);
      this.#routeForState(room.state);
    });
    room.onMessage<PrivatePlayerStateEvent>('private:state', (event) =>
      privateSnapshotStore.getState().applyPlayerState(event),
    );
    room.onMessage<PrivateSonarSnapshotEvent>('private:sonar', (event) =>
      privateSnapshotStore.getState().addDetection(event),
    );
    room.onMessage<ErrorEvent>('room:error', (event) => uiStore.getState().setError(event.message));
    room.onMessage<ShotResolutionEvent>('match:shot', (event) =>
      matchViewStore.getState().applyShot(event),
    );
    room.onError((_code, message) =>
      uiStore.getState().setError(message ?? 'Room connection error.'),
    );
    room.onLeave((code) => {
      if (this.#pageClosing || code === 1000 || code === 4000) return;
      if (this.#room === room) this.#room = null;
      connectionStore.getState().setStatus('disconnected');
      uiStore.getState().setScreen('connecting');
      uiStore.getState().setBusy(true, 'Connection lost. Reconnecting…');
      const reconnectToken = sessionStore.getState().roomSession?.reconnectToken;
      if (reconnectToken) void this.reconnect(reconnectToken).catch(() => undefined);
    });

    room.send('session:request');
    this.#applyState(room.state);
  }

  #applyState(state: RoomWireState): void {
    if (!state || typeof state.protocolVersion !== 'number' || !state.players?.forEach) return;
    if (state.protocolVersion > GAMEPLAY_CONFIG.protocolVersion) {
      sessionStore.getState().clearRoomSession();
      connectionStore.getState().setStatus('error');
      uiStore.getState().setScreen('landing');
      uiStore
        .getState()
        .setError('This game client is out of date. Refresh to load the latest version.');
      return;
    }
    const players: PublicPlayerState[] = [];
    state.players.forEach((player) => {
      const revealed = player.revealedX >= 0 && player.revealedY >= 0;
      players.push({
        playerId: player.playerId,
        displayName: player.displayName,
        role: player.role,
        hearts: player.hearts,
        connected: player.connected,
        alive: player.alive,
        isHost: player.isHost,
        revealedPosition: revealed ? { x: player.revealedX, y: player.revealedY } : null,
        lockedAimAngleRad: state.phase === 'resolution' ? player.lockedAimAngleRad : null,
      });
    });
    matchViewStore.getState().applyPublicState({
      revision: state.revision,
      phase: state.phase,
      phaseStartedAtServerMs: state.phaseStartedAtServerMs,
      phaseEndsAtServerMs: state.phaseEndsAtServerMs || null,
      roundNumber: state.roundNumber,
      activeShooterId: state.activeShooterId || null,
      firingOrder: Array.from(state.firingOrder ?? []),
      winnerPlayerId: state.winnerPlayerId || null,
      players,
      lastShot: matchViewStore.getState().lastShot,
    });
    privateSnapshotStore.getState().prune(Date.now());
    this.#routeForState(state);
  }

  #routeForState(state: RoomWireState): void {
    if (!state?.players?.forEach) return;
    const playerId = sessionStore.getState().roomSession?.playerId;
    let role: PlayerRole | null = null;
    state.players.forEach((player) => {
      if (player.playerId === playerId) role = player.role;
    });
    if (state.phase === 'lobby') uiStore.getState().setScreen('lobby');
    else if (state.phase === 'results') uiStore.getState().setScreen('results');
    else if (role === 'spectator') uiStore.getState().setScreen('spectator');
    else uiStore.getState().setScreen('match');
  }

  async #waitForServer(status: 'connecting' | 'reconnecting'): Promise<void> {
    await this.#wakeService.waitUntilReady({
      onAttempt: ({ attempt, maximumAttempts }) => {
        connectionStore.getState().setStatus(status, attempt);
        uiStore
          .getState()
          .setBusy(
            true,
            attempt === 1
              ? 'Waking multiplayer server…'
              : `Still waking server… attempt ${attempt} of ${maximumAttempts}`,
          );
      },
    });
  }
}

export const roomClient = new InvisiFightClient();

export const CLIENT_NETWORK_TICK_MS = 1_000 / GAMEPLAY_CONFIG.networkUpdateHz;
