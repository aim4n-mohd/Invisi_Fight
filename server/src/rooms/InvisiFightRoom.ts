import { nanoid } from 'nanoid';
import { Room, ServerError } from '@colyseus/core';
import type { Client } from '@colyseus/core';
import {
  GAMEPLAY_CONFIG,
  NETWORK_TICK_MS,
  type ErrorEvent,
  type PlayerInputMessage,
  type PrivatePlayerStateEvent,
  type PrivateSonarSnapshotEvent,
  type ReplayToLobbyMessage,
  type RoomJoinOptions,
  type SessionReadyEvent,
  type StartMatchMessage,
  playerInputSchema,
  roomJoinOptionsSchema,
} from '@invisi-fight/shared';
import { AuditLogService } from '../services/AuditLogService.js';
import { RoomAuthError, RoomAuthService } from '../services/RoomAuthService.js';
import { SessionService } from '../services/SessionService.js';
import { CombatResolver, type Combatant } from '../services/CombatResolver.js';
import { FiringOrderService } from '../services/FiringOrderService.js';
import { MatchClock } from '../services/MatchClock.js';
import { InputRateLimiter } from '../services/InputRateLimiter.js';
import { SonarService } from '../services/SonarService.js';
import { createRoomCode } from '../services/roomCode.js';
import { ROOM_MESSAGES } from './InvisiFightRoomMessages.js';
import { InvisiFightRoomState, PublicPlayerSchema } from './InvisiFightRoomState.js';

interface RuntimePlayer {
  playerId: string;
  sessionToken: string;
  clientSessionId: string;
}

interface RoomCreationOptions extends Partial<RoomJoinOptions> {
  reconnectGraceMs?: number;
}

export class InvisiFightRoom extends Room<InvisiFightRoomState> {
  readonly #sessions = new SessionService();
  readonly #auth = new RoomAuthService();
  readonly #audit = new AuditLogService();
  readonly #runtimeByClient = new Map<string, RuntimePlayer>();
  readonly #combatants = new Map<string, Combatant>();
  readonly #combat = new CombatResolver();
  readonly #order = new FiringOrderService();
  readonly #sonar = new SonarService();
  readonly #matchClock = new MatchClock();
  readonly #inputRateLimiter = new InputRateLimiter();
  #reconnectGraceMs: number = GAMEPLAY_CONFIG.reconnectGraceMs;

  async onCreate(options: RoomCreationOptions): Promise<void> {
    const roomCode = options.roomCode
      ? this.#auth.validateRoomCode(options.roomCode)
      : createRoomCode();
    this.#reconnectGraceMs = options.reconnectGraceMs ?? GAMEPLAY_CONFIG.reconnectGraceMs;
    this.setState(new InvisiFightRoomState(roomCode));
    this.patchRate = 1_000 / GAMEPLAY_CONFIG.networkUpdateHz;
    this.setSeatReservationTime(this.#reconnectGraceMs / 1_000);
    Object.assign(this.listing, { roomCode });
    await this.setMetadata({ roomCode });

    this.onMessage(ROOM_MESSAGES.SESSION_REQUEST, (client) => this.#sendSession(client));
    this.onMessage<PlayerInputMessage>(ROOM_MESSAGES.PLAYER_INPUT, (client, message) =>
      this.#applyInput(client, message),
    );
    this.onMessage<StartMatchMessage>(ROOM_MESSAGES.START_MATCH, (client, message) =>
      this.#startMatch(client, message),
    );
    this.onMessage<ReplayToLobbyMessage>(ROOM_MESSAGES.REPLAY_TO_LOBBY, (client, message) =>
      this.#replayToLobby(client, message),
    );
    this.setSimulationInterval((deltaMs) => this.#simulate(deltaMs), NETWORK_TICK_MS);

    this.#audit.write('info', { eventName: 'room_created', roomId: this.roomId });
  }

  onAuth(_client: Client, options: unknown): RoomJoinOptions {
    const parsed = roomJoinOptionsSchema.safeParse(options);
    if (!parsed.success) throw new ServerError(400, 'Name or room code is invalid.');
    if (parsed.data.roomCode && parsed.data.roomCode !== this.state.roomCode) {
      throw new ServerError(404, 'That room code could not be found.');
    }
    return parsed.data;
  }

  onJoin(client: Client, options?: RoomJoinOptions, auth?: RoomJoinOptions): void {
    const joinOptions = auth ?? options;
    if (!joinOptions) throw new ServerError(400, 'Name or room code is invalid.');
    const existingSession = joinOptions.sessionToken
      ? this.#sessions.verify(joinOptions.sessionToken, this.roomId)
      : null;

    if (existingSession) {
      const player = this.state.players.get(existingSession.playerId);
      if (player) {
        player.connected = true;
        const rotated = this.#sessions.rotate(joinOptions.sessionToken ?? '');
        const token = rotated ?? joinOptions.sessionToken ?? '';
        this.#replaceRuntimeConnection(player.playerId, client.sessionId);
        this.#runtimeByClient.set(client.sessionId, {
          playerId: player.playerId,
          sessionToken: token,
          clientSessionId: client.sessionId,
        });
        this.state.revision += 1;
        this.#sendSession(client);
        return;
      }
    }

    const displayName = this.#auth.validateDisplayName(joinOptions.playerName);
    this.#auth.ensureUniqueName(
      displayName,
      Array.from(this.state.players.values()).map((player) => player.displayName),
    );

    const playerId = nanoid(12);
    const isFirstPlayer = this.state.players.size === 0;
    const role = this.#auth.roleForJoin(this.state.phase, isFirstPlayer);
    const publicPlayer = new PublicPlayerSchema();
    publicPlayer.playerId = playerId;
    publicPlayer.displayName = displayName;
    publicPlayer.role = role;
    publicPlayer.isHost = role === 'host';
    publicPlayer.hearts = GAMEPLAY_CONFIG.startingHearts;
    this.state.players.set(playerId, publicPlayer);
    this.#combatants.set(playerId, this.#createCombatant(playerId, this.state.players.size - 1));
    if (publicPlayer.isHost) this.state.hostPlayerId = playerId;

    const sessionToken = this.#sessions.issue({
      roomId: this.roomId,
      playerId,
      role,
      expiresAtMs: Date.now() + 24 * 60 * 60 * 1_000,
    });
    this.#runtimeByClient.set(client.sessionId, {
      playerId,
      sessionToken,
      clientSessionId: client.sessionId,
    });
    this.state.revision += 1;
    this.#sendSession(client);
    this.#audit.write('info', {
      eventName: 'room_joined',
      roomId: this.roomId,
      playerId,
      phase: this.state.phase,
    });
  }

  async onLeave(client: Client, consented: boolean): Promise<void> {
    const runtime = this.#runtimeByClient.get(client.sessionId);
    if (!runtime) return;
    const player = this.state.players.get(runtime.playerId);
    if (player) player.connected = false;
    this.state.revision += 1;

    if (consented) return;
    try {
      const restoredClient = await this.allowReconnection(client, this.#reconnectGraceMs / 1_000);
      this.#runtimeByClient.delete(client.sessionId);
      this.#runtimeByClient.set(restoredClient.sessionId, {
        ...runtime,
        clientSessionId: restoredClient.sessionId,
      });
      if (player) player.connected = true;
      this.state.revision += 1;
      this.#audit.write('info', {
        eventName: 'reconnect_accepted',
        roomId: this.roomId,
        playerId: runtime.playerId,
      });
    } catch {
      this.#audit.write('warn', {
        eventName: 'reconnect_expired',
        roomId: this.roomId,
        playerId: runtime.playerId,
      });
    }
  }

  onDispose(): void {
    this.#sessions.revokeRoom(this.roomId);
    this.#runtimeByClient.clear();
    this.#combatants.clear();
    this.#inputRateLimiter.clear();
    this.#audit.write('info', { eventName: 'room_disposed', roomId: this.roomId });
  }

  #sendSession(client: Client): void {
    const runtime = this.#runtimeByClient.get(client.sessionId);
    if (!runtime) return;
    const player = this.state.players.get(runtime.playerId);
    if (!player) return;
    const event: SessionReadyEvent = {
      type: 'session_ready',
      sessionToken: runtime.sessionToken,
      playerId: runtime.playerId,
      roomId: this.roomId,
      roomCode: this.state.roomCode,
      role: player.role,
      isHost: player.isHost,
      serverTimeMs: Date.now(),
    };
    client.send(ROOM_MESSAGES.SESSION_READY, event);
  }

  #startMatch(client: Client, message: StartMatchMessage): void {
    const runtime = this.#runtimeByClient.get(client.sessionId);
    const record = runtime ? this.#sessions.verify(message.sessionToken, this.roomId) : null;
    const player = record ? this.state.players.get(record.playerId) : null;
    try {
      if (!record || !player)
        throw new RoomAuthError('ERR_AUTH_002', 'Your session expired. Please join again.');
      const activeCount = Array.from(this.state.players.values()).filter(
        (entry) => entry.role !== 'spectator' && entry.connected,
      ).length;
      this.#auth.assertCanStart(player.role, activeCount, this.state.phase);
      this.#startPlanning(true);
    } catch (error) {
      this.#sendError(client, error);
    }
  }

  #replayToLobby(client: Client, message: ReplayToLobbyMessage): void {
    const record = this.#sessions.verify(message.sessionToken, this.roomId);
    if (!record) {
      this.#sendError(
        client,
        new RoomAuthError('ERR_AUTH_002', 'Your session expired. Please join again.'),
      );
      return;
    }
    if (this.state.phase !== 'results') {
      this.#sendError(
        client,
        new RoomAuthError('ERR_ROOM_006', 'That action cannot be used right now.'),
      );
      return;
    }
    this.state.phase = 'lobby';
    this.state.phaseStartedAtServerMs = Date.now();
    this.state.phaseEndsAtServerMs = 0;
    this.state.roundNumber = 0;
    this.state.activeShooterId = '';
    this.state.winnerPlayerId = '';
    this.state.firingOrder.clear();
    for (const player of this.state.players.values()) {
      player.hearts = GAMEPLAY_CONFIG.startingHearts;
      player.alive = true;
      player.role = player.isHost ? 'host' : 'player';
      player.revealedX = -1;
      player.revealedY = -1;
      const combatant = this.#combatants.get(player.playerId);
      if (combatant) {
        combatant.hearts = GAMEPLAY_CONFIG.startingHearts;
        combatant.alive = true;
        combatant.aimAngleRad = 0;
        combatant.lockedAimAngleRad = 0;
      }
    }
    this.state.revision += 1;
  }

  #createCombatant(playerId: string, index: number): Combatant {
    const angle = (index * Math.PI * 2) / Math.max(2, this.state.players.size);
    return {
      playerId,
      position: {
        x: GAMEPLAY_CONFIG.arenaWidth / 2 + Math.cos(angle) * 150,
        y: GAMEPLAY_CONFIG.arenaHeight / 2 + Math.sin(angle) * 150,
      },
      aimAngleRad: angle + Math.PI,
      lockedAimAngleRad: angle + Math.PI,
      hearts: GAMEPLAY_CONFIG.startingHearts,
      alive: true,
      velocity: { x: 0, y: 0 },
      inputSequence: 0,
    };
  }

  #applyInput(client: Client, message: PlayerInputMessage): void {
    if (this.state.phase !== 'planning') return;
    const runtime = this.#runtimeByClient.get(client.sessionId);
    const parsed = playerInputSchema.safeParse(message);
    if (!runtime || !parsed.success) return;
    const publicPlayer = this.state.players.get(runtime.playerId);
    const combatant = this.#combatants.get(runtime.playerId);
    if (!publicPlayer || !combatant || publicPlayer.role === 'spectator' || !combatant.alive)
      return;
    if (!this.#inputRateLimiter.allow(runtime.playerId)) return;
    if (parsed.data.sequence <= combatant.inputSequence) return;
    combatant.inputSequence = parsed.data.sequence;
    const magnitude = Math.hypot(parsed.data.moveX, parsed.data.moveY);
    const scale = magnitude > 1 ? 1 / magnitude : 1;
    combatant.velocity.x = parsed.data.moveX * scale * GAMEPLAY_CONFIG.playerSpeedPxPerSecond;
    combatant.velocity.y = parsed.data.moveY * scale * GAMEPLAY_CONFIG.playerSpeedPxPerSecond;
    combatant.aimAngleRad = parsed.data.aimAngleRad;
  }

  #simulate(deltaMs: number): void {
    if (this.state.phase !== 'planning') return;
    const deltaSeconds = Math.min(deltaMs, 250) / 1_000;
    for (const combatant of this.#combatants.values()) {
      const publicPlayer = this.state.players.get(combatant.playerId);
      if (!combatant.alive || publicPlayer?.role === 'spectator') continue;
      combatant.position.x = Math.min(
        GAMEPLAY_CONFIG.arenaWidth - GAMEPLAY_CONFIG.playerRadius,
        Math.max(
          GAMEPLAY_CONFIG.playerRadius,
          combatant.position.x + combatant.velocity.x * deltaSeconds,
        ),
      );
      combatant.position.y = Math.min(
        GAMEPLAY_CONFIG.arenaHeight - GAMEPLAY_CONFIG.playerRadius,
        Math.max(
          GAMEPLAY_CONFIG.playerRadius,
          combatant.position.y + combatant.velocity.y * deltaSeconds,
        ),
      );
      this.#sendPrivateState(combatant);
    }
    this.#sampleSonar();
    if (this.#matchClock.hasExpired(this.state.phaseEndsAtServerMs)) this.#beginResolution();
  }

  #sendPrivateState(combatant: Combatant): void {
    const client = this.#clientForPlayer(combatant.playerId);
    if (!client) return;
    const event: PrivatePlayerStateEvent = {
      type: 'private_state',
      playerId: combatant.playerId,
      position: { ...combatant.position },
      velocity: { ...combatant.velocity },
      aimAngleRad: combatant.aimAngleRad,
      serverTimeMs: Date.now(),
      sequence: combatant.inputSequence,
    };
    client.send(ROOM_MESSAGES.PRIVATE_STATE, event);
  }

  #sampleSonar(): void {
    const players = Array.from(this.#combatants.values()).map((combatant) => ({
      playerId: combatant.playerId,
      position: combatant.position,
      alive: combatant.alive,
      spectator: this.state.players.get(combatant.playerId)?.role === 'spectator',
    }));
    const nowMs = Date.now();
    const detections = this.#sonar.sample(players, nowMs, this.state.phaseStartedAtServerMs);
    for (const detection of detections) {
      const client = this.#clientForPlayer(detection.detectorId);
      if (!client) continue;
      const event: PrivateSonarSnapshotEvent = {
        type: 'private_sonar',
        snapshotId: `${detection.cycle}:${detection.detectorId}:${detection.targetId}`,
        detectedPlayerId: detection.targetId,
        position: detection.position,
        detectedAtServerMs: detection.detectedAtServerMs,
        expiresAtServerMs: detection.expiresAtServerMs,
        sweepAngleRad: detection.sweepAngleRad,
      };
      client.send(ROOM_MESSAGES.PRIVATE_SONAR, event);
    }
  }

  #startPlanning(firstRound: boolean): void {
    const living = this.#livingCombatants();
    if (firstRound) {
      this.state.roundNumber = 1;
      const nextOrder = this.#order.createInitialOrder(
        living.map((combatant) => combatant.playerId),
      );
      this.#replaceFiringOrder(nextOrder);
    } else {
      this.state.roundNumber += 1;
      const nextOrder = this.#order.rotateOne(
        Array.from(this.state.firingOrder).filter((playerId): playerId is string =>
          Boolean(playerId),
        ),
        new Set(living.map((entry) => entry.playerId)),
      );
      this.#replaceFiringOrder(nextOrder);
    }
    const window = this.#matchClock.planningWindow();
    this.state.phase = 'planning';
    this.state.phaseStartedAtServerMs = window.startedAtServerMs;
    this.state.phaseEndsAtServerMs = window.endsAtServerMs;
    this.state.activeShooterId = '';
    this.#sonar.reset();
    for (const combatant of living) {
      combatant.velocity.x = 0;
      combatant.velocity.y = 0;
      const player = this.state.players.get(combatant.playerId);
      if (player) {
        player.revealedX = -1;
        player.revealedY = -1;
        player.lockedAimAngleRad = 0;
      }
    }
    this.state.revision += 1;
  }

  #beginResolution(): void {
    if (this.state.phase !== 'planning') return;
    this.state.phase = 'resolution';
    this.state.phaseStartedAtServerMs = Date.now();
    this.state.phaseEndsAtServerMs = 0;
    const combatants = Array.from(this.#combatants.values());
    for (const combatant of combatants) {
      combatant.velocity.x = 0;
      combatant.velocity.y = 0;
      combatant.lockedAimAngleRad = combatant.aimAngleRad;
    }
    this.#combat.separateOverlaps(combatants);
    this.#syncPublicCombatState(true);
    this.state.revision += 1;
    this.#resolveShotAt(0);
  }

  #resolveShotAt(index: number): void {
    const shooterId = this.state.firingOrder[index];
    if (!shooterId) {
      this.#finishResolution();
      return;
    }
    const shooter = this.#combatants.get(shooterId);
    if (!shooter) {
      this.clock.setTimeout(
        () => this.#resolveShotAt(index + 1),
        GAMEPLAY_CONFIG.shotResolutionPauseMs,
      );
      return;
    }
    this.state.activeShooterId = shooterId;
    const event = this.#combat.resolveShot(
      shooter,
      Array.from(this.#combatants.values()),
      this.state.roundNumber,
      Date.now(),
    );
    this.#syncPublicCombatState(true);
    this.state.revision += 1;
    this.broadcast(ROOM_MESSAGES.SHOT_RESOLVED, event);
    const winner = this.#livingCombatants();
    if (winner.length === 1) {
      this.clock.setTimeout(
        () => this.#declareWinner(winner[0]!.playerId),
        GAMEPLAY_CONFIG.shotResolutionPauseMs,
      );
      return;
    }
    this.clock.setTimeout(
      () => this.#resolveShotAt(index + 1),
      GAMEPLAY_CONFIG.shotResolutionPauseMs,
    );
  }

  #finishResolution(): void {
    const living = this.#livingCombatants();
    if (living.length === 1) this.#declareWinner(living[0]!.playerId);
    else this.#startPlanning(false);
  }

  #declareWinner(playerId: string): void {
    this.state.phase = 'results';
    this.state.phaseStartedAtServerMs = Date.now();
    this.state.phaseEndsAtServerMs = 0;
    this.state.activeShooterId = '';
    this.state.winnerPlayerId = playerId;
    this.state.revision += 1;
  }

  #syncPublicCombatState(reveal: boolean): void {
    for (const combatant of this.#combatants.values()) {
      const player = this.state.players.get(combatant.playerId);
      if (!player) continue;
      player.hearts = combatant.hearts;
      player.alive = combatant.alive;
      player.lockedAimAngleRad = combatant.lockedAimAngleRad;
      player.revealedX = reveal && combatant.alive ? combatant.position.x : -1;
      player.revealedY = reveal && combatant.alive ? combatant.position.y : -1;
      if (!combatant.alive) player.role = 'spectator';
    }
  }

  #livingCombatants(): Combatant[] {
    return Array.from(this.#combatants.values()).filter(
      (combatant) =>
        combatant.alive && this.state.players.get(combatant.playerId)?.role !== 'spectator',
    );
  }

  #replaceFiringOrder(order: readonly string[]): void {
    this.state.firingOrder.clear();
    this.state.firingOrder.push(...order);
  }

  #clientForPlayer(playerId: string): Client | undefined {
    return this.clients.find(
      (client) => this.#runtimeByClient.get(client.sessionId)?.playerId === playerId,
    );
  }

  #replaceRuntimeConnection(playerId: string, replacementSessionId: string): void {
    for (const [clientSessionId, runtime] of this.#runtimeByClient) {
      if (runtime.playerId !== playerId || clientSessionId === replacementSessionId) continue;
      this.#runtimeByClient.delete(clientSessionId);
      this.clients
        .find((client) => client.sessionId === clientSessionId)
        ?.leave(4000, 'Session replaced.');
    }
  }

  #sendError(client: Client, error: unknown): void {
    const event: ErrorEvent =
      error instanceof RoomAuthError
        ? { type: 'error', code: error.code, message: error.message, retryable: false }
        : {
            type: 'error',
            code: 'ERR_SYS_001',
            message: 'The room could not process that action.',
            retryable: true,
          };
    client.send(ROOM_MESSAGES.ERROR, event);
  }
}
