import { Client as ColyseusClient } from 'colyseus.js';
import type { Room } from 'colyseus.js';
import {
  GAMEPLAY_CONFIG,
  ECHO_GAMEPLAY_CONFIG,
  isLegalModePhase,
  type EchoResultStats,
  type ErrorEvent,
  type GameMode,
  type MatchPhase,
  type PlayerInputMessage,
  type PlayerRole,
  type PrivatePlayerStateEvent,
  type PublicPlayerState,
  type RecapOutcome,
  type SessionReadyEvent,
  type ShotResolutionEvent,
} from '@invisi-fight/shared';
import {
  echoActionStatusEventSchema,
  privateEchoNoiseEventSchema,
  publicSoundCueEventSchema,
} from '@invisi-fight/shared';
import { CLIENT_CONFIG } from '../config/clientConfig.js';
import { reconnectWithSessionFallback } from './reconnectPolicy.js';
import {
  routePrivateSonarSnapshot,
  routePublicSonarEmission,
  routeShotLockStatus,
  routeSonarStatus,
} from './sonarEventRouter.js';
import { connectionStore } from '../state/connectionStore.js';
import { matchViewStore } from '../state/matchViewStore.js';
import { privateSnapshotStore } from '../state/privateSnapshotStore.js';
import { sessionStore } from '../state/sessionStore.js';
import { uiStore } from '../state/uiStore.js';
import { serverClock } from './serverClock.js';
import { echoStore } from '../state/echoStore.js';

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
  inCurrentRoster: boolean;
  readyForNextMatch: boolean;
  rivalryWins: number;
  award: string;
  resultStats: EchoResultStats & { closestMissPx: number };
}

interface PlayerMapWireState {
  forEach: (callback: (player: PublicPlayerWireState, playerId: string) => void) => void;
}

interface RoomWireState {
  protocolVersion: number;
  revision: number;
  roomCode: string;
  mode: GameMode;
  phase: MatchPhase;
  phaseStartedAtServerMs: number;
  phaseEndsAtServerMs: number;
  roundNumber: number;
  activeShooterId: string;
  winnerPlayerId: string;
  nextFirstShooterId: string;
  firingOrder: Iterable<string>;
  recapEntries: Iterable<{
    shotId: string;
    orderIndex: number;
    shooterId: string;
    outcome: RecapOutcome;
    targetId: string;
    targetHeartsRemaining: number;
    fatal: boolean;
    resolvedAtServerMs: number;
  }>;
  players: PlayerMapWireState;
}

const ROOM_NAME = 'invisi_fight';

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes('no rooms found') || message.includes('could not be found')) {
      return 'Room not found in this mode. Check the code and selected mode.';
    }
    if (message.includes('name') && message.includes('invalid')) {
      return 'That display name is not available in this room.';
    }
  }
  return 'The multiplayer server could not be reached. Please try again.';
}

export class InvisiFightClient {
  readonly #client = new ColyseusClient(CLIENT_CONFIG.serverWsUrl);
  #room: Room<RoomWireState> | null = null;
  #reconnectPromise: Promise<void> | null = null;
  #connectPromise: Promise<void> | null = null;
  #operation = 0;
  #pageClosing = false;
  #sonarSequence = 0;
  #shotLockSequence = 0;
  #fireSequence = 0;
  #decoySequence = 0;
  #nextMatchSequence = 0;
  #inputSequence = 0;
  #observedRound: number | null = null;
  #latestSession: SessionReadyEvent | null = null;

  get room(): Room<RoomWireState> | null {
    return this.#room;
  }

  prepareForPageClose(): void {
    if (this.#pageClosing) return;
    this.#pageClosing = true;
    if (this.#room?.connection.isOpen) void this.#room.leave(false);
  }

  async createRoom(playerName: string, mode: GameMode = 'echo_hunt'): Promise<void> {
    if (!this.#connectPromise) {
      const pending = this.#connect('create', playerName, undefined, mode).finally(() => {
        if (this.#connectPromise === pending) this.#connectPromise = null;
      });
      this.#connectPromise = pending;
    }
    return this.#connectPromise;
  }

  async joinRoom(
    playerName: string,
    roomCode: string,
    mode: GameMode = 'echo_hunt',
  ): Promise<void> {
    if (!this.#connectPromise) {
      const pending = this.#connect(
        'join',
        playerName,
        roomCode.trim().toUpperCase(),
        mode,
      ).finally(() => {
        if (this.#connectPromise === pending) this.#connectPromise = null;
      });
      this.#connectPromise = pending;
    }
    return this.#connectPromise;
  }

  async reconnect(reconnectToken: string): Promise<void> {
    if (this.#reconnectPromise) return this.#reconnectPromise;
    const pending = this.#performReconnect(reconnectToken).finally(() => {
      if (this.#reconnectPromise === pending) this.#reconnectPromise = null;
    });
    this.#reconnectPromise = pending;
    return this.#reconnectPromise;
  }

  async #performReconnect(reconnectToken: string): Promise<void> {
    const operationId = ++this.#operation;
    const startedAt = performance.now();
    console.info('[connection]', { operationId, operation: 'reconnect', stage: 'transport-start' });
    connectionStore.getState().setStatus('reconnecting', 0);
    uiStore.getState().setScreen('connecting');
    uiStore.getState().setBusy(true, 'Reconnecting to room…');
    try {
      const roomSession = sessionStore.getState().roomSession;
      if (!roomSession) throw new Error('The saved room session is unavailable.');
      const room = await reconnectWithSessionFallback(
        () => this.#client.reconnect<RoomWireState>(reconnectToken),
        () =>
          this.#client.joinById<RoomWireState>(roomSession.roomId, {
            playerName: sessionStore.getState().playerName || 'Returning player',
            sessionToken: roomSession.sessionToken,
            mode: roomSession.mode,
          }),
      );
      if (operationId !== this.#operation) {
        await room.leave(true);
        return;
      }
      console.info('[connection]', {
        operationId,
        operation: 'reconnect',
        stage: 'transport-open',
        durationMs: Math.round(performance.now() - startedAt),
      });
      this.#attachRoom(room);
    } catch (error) {
      if (operationId !== this.#operation) return;
      console.info('[connection]', {
        operationId,
        operation: 'reconnect',
        stage: 'transport-failed',
        durationMs: Math.round(performance.now() - startedAt),
      });
      sessionStore.getState().clearRoomSession();
      connectionStore.getState().setStatus('error');
      uiStore.getState().setScreen('landing');
      uiStore
        .getState()
        .setError('That room is no longer available. Create a new room or join again.');
      throw error;
    }
  }

  sendInput(input: PlayerInputMessage): void {
    if (!this.#room || connectionStore.getState().status !== 'connected') return;
    this.#room.send('input:player', { ...input, sequence: ++this.#inputSequence });
  }

  stopInput(): void {
    this.sendInput({
      moveX: 0,
      moveY: 0,
      running: false,
      aimAngleRad: privateSnapshotStore.getState().playerState?.aimAngleRad ?? 0,
      sequence: 0,
      clientTimeMs: Date.now(),
    });
  }

  sendFire(aimAngleRad: number): boolean {
    if (!this.#canEchoAct() || !Number.isFinite(aimAngleRad)) return false;
    const now = serverClock.now();
    const echo = echoStore.getState();
    const latestPrediction = echo.predictions.at(-1);
    if (
      echo.ammo === 0 ||
      echo.reloadEndsAtServerMs > 0 ||
      now < echo.fireReadyAtServerMs ||
      (latestPrediction &&
        now < latestPrediction.createdAtServerMs + ECHO_GAMEPLAY_CONFIG.fireCooldownMs)
    )
      return false;
    const local = privateSnapshotStore.getState().playerState;
    const session = sessionStore.getState().roomSession;
    if (!local || !session) return false;
    const sequence = ++this.#fireSequence;
    echo.predictShot({
      sequence,
      origin: { ...local.position },
      angleRad: aimAngleRad,
      createdAtServerMs: now,
    });
    this.#room!.send('input:fire', {
      sessionToken: session.sessionToken,
      sequence,
      aimAngleRad,
      clientTimeMs: Date.now(),
    });
    return true;
  }

  sendDecoy(aimAngleRad: number): boolean {
    if (!this.#canEchoAct() || !Number.isFinite(aimAngleRad)) return false;
    const phase = matchViewStore.getState().phase;
    if (phase !== 'lobby' && phase !== 'countdown' && !echoStore.getState().decoyAvailable)
      return false;
    this.#room!.send('input:decoy', {
      sessionToken: sessionStore.getState().roomSession!.sessionToken,
      sequence: ++this.#decoySequence,
      aimAngleRad,
      clientTimeMs: Date.now(),
    });
    return true;
  }

  sendNextMatch(ready: boolean): void {
    const session = sessionStore.getState().roomSession;
    if (!this.#room || !session || connectionStore.getState().status !== 'connected') return;
    this.#room.send('input:next-match', {
      sessionToken: session.sessionToken,
      sequence: ++this.#nextMatchSequence,
      ready,
      clientTimeMs: Date.now(),
    });
  }

  #canEchoAct(): boolean {
    const match = matchViewStore.getState();
    const playerId = sessionStore.getState().roomSession?.playerId;
    const player = match.players.find((entry) => entry.playerId === playerId);
    return Boolean(
      this.#room &&
      connectionStore.getState().status === 'connected' &&
      match.mode === 'echo_hunt' &&
      ['lobby', 'countdown', 'echo_hunt', 'final_echo'].includes(match.phase) &&
      player?.inCurrentRoster &&
      player.alive,
    );
  }

  triggerSonar(): boolean {
    const roomSession = sessionStore.getState().roomSession;
    const match = matchViewStore.getState();
    const privateState = privateSnapshotStore.getState();
    const localPlayer = match.players.find((player) => player.playerId === roomSession?.playerId);
    const nowServerMs = serverClock.now();
    if (
      !this.#room ||
      connectionStore.getState().status !== 'connected' ||
      !roomSession ||
      (match.mode === 'echo_hunt' ? !this.#canEchoAct() : match.phase !== 'hunt') ||
      !localPlayer?.alive ||
      localPlayer.role === 'spectator' ||
      !privateState.playerState ||
      nowServerMs < privateState.sonarReadyAtServerMs ||
      privateState.localSonarPulse?.status === 'predicted'
    ) {
      return false;
    }

    this.#sonarSequence += 1;
    privateState.predictSonar(this.#sonarSequence, nowServerMs, privateState.playerState.position);
    this.#room.send('input:sonar', {
      sessionToken: roomSession.sessionToken,
      sequence: this.#sonarSequence,
      clientTimeMs: Date.now(),
    });
    return true;
  }

  lockShot(aimAngleRad: number): boolean {
    const roomSession = sessionStore.getState().roomSession;
    const match = matchViewStore.getState();
    const localPlayer = match.players.find((player) => player.playerId === roomSession?.playerId);
    if (
      !this.#room ||
      connectionStore.getState().status !== 'connected' ||
      !roomSession ||
      match.phase !== 'commit' ||
      !localPlayer?.alive ||
      localPlayer.role === 'spectator' ||
      !Number.isFinite(aimAngleRad)
    ) {
      return false;
    }

    this.#shotLockSequence += 1;
    privateSnapshotStore.getState().predictShotLock(this.#shotLockSequence, aimAngleRad);
    this.#room.send('input:lock-shot', {
      sessionToken: roomSession.sessionToken,
      aimAngleRad,
      sequence: this.#shotLockSequence,
      clientTimeMs: Date.now(),
    });
    return true;
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
    ++this.#operation;
    const previousRoom = this.#room;
    this.#room = null;
    this.#connectPromise = null;
    this.#reconnectPromise = null;
    sessionStore.getState().clearRoomSession();
    connectionStore.getState().clear();
    matchViewStore.getState().reset();
    privateSnapshotStore.getState().reset();
    echoStore.getState().reset();
    uiStore.getState().setScreen('landing');
    uiStore.getState().setBusy(false);
    if (previousRoom) await previousRoom.leave(true);
  }

  async #connect(
    operation: 'create' | 'join',
    playerName: string,
    roomCode: string | undefined,
    mode: GameMode,
  ): Promise<void> {
    const operationId = ++this.#operation;
    const startedAt = performance.now();
    sessionStore.getState().clearRoomSession();
    matchViewStore.getState().reset();
    privateSnapshotStore.getState().reset();
    echoStore.getState().reset();
    connectionStore.getState().setStatus('connecting');
    uiStore.getState().setScreen('connecting');
    uiStore.getState().setBusy(true, 'Connecting to multiplayer server…');
    const slowNotice = window.setTimeout(() => {
      if (operationId === this.#operation)
        uiStore
          .getState()
          .setBusy(
            true,
            'Still connecting to the room. The server may be starting; this request is still in progress.',
          );
    }, 8_000);
    console.info('[connection]', { operationId, operation, stage: 'matchmaker-start', mode });
    try {
      const sessionToken = sessionStore.getState().roomSession?.sessionToken;
      const options = { playerName, roomCode, sessionToken, mode };
      const room =
        operation === 'create'
          ? await this.#client.create<RoomWireState>(ROOM_NAME, { playerName, mode })
          : await this.#client.join<RoomWireState>(ROOM_NAME, options);
      if (operationId !== this.#operation) {
        await room.leave(true);
        return;
      }
      console.info('[connection]', {
        operationId,
        operation,
        stage: 'transport-open',
        durationMs: Math.round(performance.now() - startedAt),
      });
      this.#attachRoom(room);
    } catch (error) {
      if (operationId !== this.#operation) return;
      console.info('[connection]', {
        operationId,
        operation,
        stage: 'transport-failed',
        durationMs: Math.round(performance.now() - startedAt),
      });
      connectionStore.getState().setStatus('error');
      uiStore.getState().setScreen('landing');
      uiStore.getState().setError(errorMessage(error));
      throw error;
    } finally {
      window.clearTimeout(slowNotice);
    }
  }

  #attachRoom(room: Room<RoomWireState>): void {
    this.#room = room;
    this.#observedRound = null;
    connectionStore.getState().setStatus('connected');
    uiStore.getState().setBusy(false);

    room.onStateChange((state) => {
      if (this.#room === room) this.#applyState(state);
    });
    room.onMessage<SessionReadyEvent>('session:ready', (event) => {
      if (this.#room !== room) return;
      this.#latestSession = event;
      serverClock.synchronize(event.serverTimeMs);
      const reconnectToken = room.reconnectionToken;
      sessionStore.getState().setRoomSession({
        playerId: event.playerId,
        sessionToken: event.sessionToken,
        reconnectToken,
        roomId: event.roomId,
        roomCode: event.roomCode,
        mode: event.mode,
      });
      privateSnapshotStore.getState().restoreSonarReadiness(event.sonarReadyAtServerMs);
      privateSnapshotStore.getState().restoreShotLock(event.shotLockStatus);
      echoStore
        .getState()
        .restore(
          event.fireReadyAtServerMs ?? 0,
          event.decoyAvailable ?? false,
          event.ammo,
          event.reloadEndsAtServerMs,
        );
      this.#fireSequence = Math.max(this.#fireSequence, event.actionSequences?.fire ?? 0);
      this.#decoySequence = Math.max(this.#decoySequence, event.actionSequences?.decoy ?? 0);
      this.#nextMatchSequence = Math.max(this.#nextMatchSequence, event.nextMatchSequence ?? 0);
      this.#inputSequence = Math.max(this.#inputSequence, event.actionSequences?.input ?? 0);
      this.#sonarSequence = Math.max(this.#sonarSequence, event.actionSequences?.sonar ?? 0);
      this.#shotLockSequence = Math.max(
        this.#shotLockSequence,
        event.shotLockStatus?.requestSequence ?? 0,
      );
      connectionStore.getState().setRoom(event.roomId, event.roomCode);
      this.#routeForState(room.state);
    });
    room.onMessage<PrivatePlayerStateEvent>('private:state', (event) => {
      if (this.#room !== room) return;
      if (event.playerId === sessionStore.getState().roomSession?.playerId) {
        privateSnapshotStore.getState().applyPlayerState(event);
        this.#inputSequence = Math.max(this.#inputSequence, event.sequence);
      }
    });
    room.onMessage('private:echo-action-status', (event: unknown) => {
      if (this.#room !== room) return;
      const parsed = echoActionStatusEventSchema.safeParse(event);
      if (parsed.success) echoStore.getState().applyStatus(parsed.data);
    });
    room.onMessage('private:echo-noise', (event: unknown) => {
      if (this.#room !== room) return;
      const parsed = privateEchoNoiseEventSchema.safeParse(event);
      if (parsed.success) echoStore.getState().applyNoise(parsed.data);
    });
    room.onMessage('match:sound-cue', (event: unknown) => {
      if (this.#room !== room) return;
      const parsed = publicSoundCueEventSchema.safeParse(event);
      if (parsed.success) matchViewStore.getState().addSoundCue(parsed.data);
    });
    room.onMessage<unknown>('private:sonar', (event) => {
      if (this.#room === room) routePrivateSonarSnapshot(event);
    });
    room.onMessage<unknown>('private:sonar-status', (event) => {
      if (this.#room === room) routeSonarStatus(event);
    });
    room.onMessage<unknown>('match:sonar-emission', (event) => {
      if (this.#room === room) routePublicSonarEmission(event);
    });
    room.onMessage<unknown>('private:shot-lock-status', (event) => {
      if (this.#room === room) routeShotLockStatus(event);
    });
    room.onMessage<ErrorEvent>('room:error', (event) => {
      if (this.#room === room) uiStore.getState().setError(event.message);
    });
    room.onMessage<ShotResolutionEvent>('match:shot', (event) => {
      if (this.#room === room) matchViewStore.getState().applyShot(event);
    });
    room.onError((_code, message) => {
      if (this.#room === room) uiStore.getState().setError(message ?? 'Room connection error.');
    });
    room.onLeave((code) => {
      if (this.#pageClosing || this.#room !== room || code === 1000 || code === 4000) return;
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
    if (state.protocolVersion !== GAMEPLAY_CONFIG.protocolVersion) {
      const incompatibleRoom = this.#room;
      this.#room = null;
      if (incompatibleRoom) void incompatibleRoom.leave(true);
      sessionStore.getState().clearRoomSession();
      connectionStore.getState().setStatus('error');
      uiStore.getState().setScreen('landing');
      uiStore.getState().setError('Game versions do not match. Refresh to load the latest client.');
      return;
    }
    if (!isLegalModePhase(state.mode, state.phase)) return;
    const previous = matchViewStore.getState();
    if (
      state.mode === 'echo_hunt' &&
      this.#observedRound !== null &&
      (previous.mode !== state.mode || this.#observedRound !== state.roundNumber)
    ) {
      const currentPrivate = privateSnapshotStore.getState().playerState;
      const freshDetections = privateSnapshotStore
        .getState()
        .detections.filter((event) => event.detectedAtServerMs >= state.phaseStartedAtServerMs);
      const freshEchoStatus = echoStore.getState().lastStatus;
      const readiness =
        freshEchoStatus && freshEchoStatus.serverTimeMs >= state.phaseStartedAtServerMs
          ? freshEchoStatus
          : this.#latestSession && this.#latestSession.serverTimeMs >= state.phaseStartedAtServerMs
            ? this.#latestSession
            : null;
      privateSnapshotStore.getState().reset();
      if (currentPrivate && currentPrivate.serverTimeMs >= state.phaseStartedAtServerMs) {
        privateSnapshotStore.getState().applyPlayerState(currentPrivate);
      }
      echoStore.getState().reset();
      freshDetections.forEach((event) => privateSnapshotStore.getState().addDetection(event));
      privateSnapshotStore.getState().restoreSonarReadiness(readiness?.sonarReadyAtServerMs ?? 0);
      echoStore
        .getState()
        .restore(
          readiness?.fireReadyAtServerMs ?? 0,
          readiness?.decoyAvailable ?? true,
          readiness?.ammo,
          readiness?.reloadEndsAtServerMs,
        );
      matchViewStore.getState().clearTransientEvents(state.phaseStartedAtServerMs);
      this.#room?.send('session:request');
    }
    this.#observedRound = state.roundNumber;
    const players: PublicPlayerState[] = [];
    state.players.forEach((player) => {
      const revealed = state.mode === 'classic' && player.revealedX >= 0 && player.revealedY >= 0;
      players.push({
        playerId: player.playerId,
        displayName: player.displayName,
        role: player.role,
        hearts: player.hearts,
        connected: player.connected,
        alive: player.alive,
        isHost: player.isHost,
        revealedPosition: revealed ? { x: player.revealedX, y: player.revealedY } : null,
        lockedAimAngleRad:
          state.mode === 'classic' &&
          (state.phase === 'resolution' || state.phase === 'recap' || state.phase === 'results')
            ? player.lockedAimAngleRad
            : null,
        inCurrentRoster: player.inCurrentRoster,
        readyForNextMatch: player.readyForNextMatch,
        rivalryWins: player.rivalryWins,
        resultStats:
          player.inCurrentRoster &&
          (state.phase === 'results' || (state.phase === 'countdown' && state.roundNumber > 0))
            ? {
                shots: player.resultStats.shots,
                hits: player.resultStats.hits,
                damage: player.resultStats.damage,
                eliminations: player.resultStats.eliminations,
                sonarDetections: player.resultStats.sonarDetections,
                emittedSound: player.resultStats.emittedSound,
                closestMissPx:
                  player.resultStats.closestMissPx >= 0 ? player.resultStats.closestMissPx : null,
                survivalMs: player.resultStats.survivalMs,
              }
            : null,
        award: player.award || null,
      });
    });
    matchViewStore.getState().applyPublicState({
      revision: state.revision,
      mode: state.mode,
      phase: state.phase,
      phaseStartedAtServerMs: state.phaseStartedAtServerMs,
      phaseEndsAtServerMs: state.phaseEndsAtServerMs || null,
      roundNumber: state.roundNumber,
      activeShooterId: state.activeShooterId || null,
      firingOrder: Array.from(state.firingOrder ?? []),
      nextFirstShooterId: state.nextFirstShooterId || null,
      recapEntries: Array.from(state.recapEntries ?? [], (entry) => ({
        shotId: entry.shotId,
        orderIndex: entry.orderIndex,
        shooterId: entry.shooterId,
        outcome: entry.outcome,
        targetId: entry.targetId || null,
        targetHeartsRemaining:
          entry.targetHeartsRemaining >= 0 ? entry.targetHeartsRemaining : null,
        fatal: entry.fatal,
        resolvedAtServerMs: entry.resolvedAtServerMs,
      })),
      winnerPlayerId: state.winnerPlayerId || null,
      players,
      lastShot: matchViewStore.getState().lastShot,
    });
    const nowServerMs = serverClock.now();
    privateSnapshotStore.getState().prune(nowServerMs);
    matchViewStore.getState().pruneSonarEmissions(nowServerMs);
    if (state.mode === 'classic' && state.phase !== 'hunt')
      privateSnapshotStore.getState().cancelSonarPrediction();
    if (state.phase === 'hunt' || state.phase === 'lobby') {
      privateSnapshotStore.getState().clearShotLock();
    }
    this.#routeForState(state);
  }

  #routeForState(state: RoomWireState): void {
    if (!state?.players?.forEach) return;
    if (state.mode === 'echo_hunt') {
      uiStore.getState().setScreen('match');
      return;
    }
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
}

export const roomClient = new InvisiFightClient();

export const CLIENT_NETWORK_TICK_MS = 1_000 / GAMEPLAY_CONFIG.networkUpdateHz;
