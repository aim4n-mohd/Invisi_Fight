import { nanoid } from 'nanoid';
import { Room, ServerError } from '@colyseus/core';
import type { Client } from '@colyseus/core';
import {
  GAMEPLAY_CONFIG,
  NETWORK_TICK_MS,
  type AcceptedShotLockStatusEvent,
  type ErrorEvent,
  type LockShotMessage,
  type PlayerInputMessage,
  type PrivatePlayerStateEvent,
  type PrivateSonarSnapshotEvent,
  type PublicSonarEmissionEvent,
  type ReplayToLobbyMessage,
  type RoomJoinOptions,
  type SessionReadyEvent,
  type ShotLockStatusEvent,
  type SonarStatusEvent,
  type StartMatchMessage,
  type TriggerSonarMessage,
  playerInputSchema,
  lockShotSchema,
  roomJoinOptionsSchema,
  triggerSonarSchema,
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
import {
  InvisiFightRoomState,
  PublicPlayerSchema,
  RecapEntrySchema,
} from './InvisiFightRoomState.js';

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
    this.onMessage<TriggerSonarMessage>(ROOM_MESSAGES.TRIGGER_SONAR, (client, message) =>
      this.#triggerSonar(client, message),
    );
    this.onMessage<LockShotMessage>(ROOM_MESSAGES.LOCK_SHOT, (client, message) =>
      this.#lockShot(client, message),
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
    publicPlayer.alive = role !== 'spectator';
    this.state.players.set(playerId, publicPlayer);
    if (role !== 'spectator') {
      this.#combatants.set(playerId, this.#createCombatant(playerId, this.state.players.size - 1));
    }
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
    if (player) {
      player.connected = false;
      const combatant = this.#combatants.get(runtime.playerId);
      if (combatant) {
        combatant.velocity.x = 0;
        combatant.velocity.y = 0;
      }
    }
    this.state.revision += 1;

    if (consented) {
      this.#removePlayer(runtime.playerId);
      return;
    }
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
      const hasReplacement = Array.from(this.#runtimeByClient.values()).some(
        (entry) =>
          entry.playerId === runtime.playerId && entry.clientSessionId !== runtime.clientSessionId,
      );
      if (!hasReplacement) {
        this.#removePlayer(runtime.playerId);
        this.#audit.write('warn', {
          eventName: 'reconnect_expired',
          roomId: this.roomId,
          playerId: runtime.playerId,
        });
      }
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
      sonarReadyAtServerMs: this.#sonar.readyAt(runtime.playerId),
      shotLockStatus: this.#acceptedShotLockStatus(this.#combatants.get(runtime.playerId)),
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
      this.#startHunt(true);
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
    this.#resetToLobby();
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
      lockSource: null,
      lockSequence: -1,
      lockedAtServerMs: 0,
      hearts: GAMEPLAY_CONFIG.startingHearts,
      alive: true,
      velocity: { x: 0, y: 0 },
      inputSequence: 0,
    };
  }

  #applyInput(client: Client, message: PlayerInputMessage): void {
    if (this.state.phase !== 'hunt' && this.state.phase !== 'commit') return;
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
    combatant.aimAngleRad = parsed.data.aimAngleRad;
    if (this.state.phase === 'commit') {
      combatant.velocity.x = 0;
      combatant.velocity.y = 0;
      this.#sendPrivateState(combatant);
      return;
    }
    const magnitude = Math.hypot(parsed.data.moveX, parsed.data.moveY);
    const scale = magnitude > 1 ? 1 / magnitude : 1;
    combatant.velocity.x = parsed.data.moveX * scale * GAMEPLAY_CONFIG.playerSpeedPxPerSecond;
    combatant.velocity.y = parsed.data.moveY * scale * GAMEPLAY_CONFIG.playerSpeedPxPerSecond;
  }

  #triggerSonar(client: Client, message: unknown): void {
    const runtime = this.#runtimeByClient.get(client.sessionId);
    const parsed = triggerSonarSchema.safeParse(message);
    const requestSequence = this.#requestSequence(message);
    const now = Date.now();
    const record =
      runtime && parsed.success
        ? this.#sessions.verify(parsed.data.sessionToken, this.roomId, now)
        : null;

    if (!runtime || !parsed.success || !record || record.playerId !== runtime.playerId) {
      const status: SonarStatusEvent = {
        type: 'sonar_status',
        accepted: false,
        requestSequence,
        readyAtServerMs: runtime ? Math.max(now, this.#sonar.readyAt(runtime.playerId)) : now,
        reason: 'invalid_request',
      };
      client.send(ROOM_MESSAGES.SONAR_STATUS, status);
      return;
    }

    const activation = this.#sonar.activate(
      this.#sonarPlayers(),
      runtime.playerId,
      this.state.phase,
      now,
    );
    if (!activation.accepted) {
      const status: SonarStatusEvent = {
        type: 'sonar_status',
        accepted: false,
        requestSequence: parsed.data.sequence,
        readyAtServerMs: activation.readyAtServerMs,
        reason: activation.reason,
      };
      client.send(ROOM_MESSAGES.SONAR_STATUS, status);
      return;
    }

    const status: SonarStatusEvent = {
      type: 'sonar_status',
      accepted: true,
      requestSequence: parsed.data.sequence,
      activatedAtServerMs: activation.activatedAtServerMs,
      readyAtServerMs: activation.readyAtServerMs,
    };
    client.send(ROOM_MESSAGES.SONAR_STATUS, status);

    const emissionId = nanoid(12);
    for (const detection of activation.detections) {
      const snapshot: PrivateSonarSnapshotEvent = {
        type: 'private_sonar_snapshot',
        snapshotId: `${emissionId}:${detection.targetId}`,
        detectedPlayerId: detection.targetId,
        position: { ...detection.position },
        detectedAtServerMs: detection.detectedAtServerMs,
        expiresAtServerMs: detection.expiresAtServerMs,
      };
      client.send(ROOM_MESSAGES.PRIVATE_SONAR, snapshot);
    }

    const emission: PublicSonarEmissionEvent = {
      type: 'sonar_emission',
      emissionId,
      emitterId: activation.detectorId,
      approximateOrigin: { ...activation.approximateOrigin },
      radius: GAMEPLAY_CONFIG.sonarPulseRadiusPx,
      emittedAtServerMs: activation.activatedAtServerMs,
      expiresAtServerMs:
        activation.activatedAtServerMs + GAMEPLAY_CONFIG.sonarPulseVisualDurationMs,
    };
    for (const peer of this.clients) {
      if (peer.sessionId === client.sessionId) continue;
      const peerRuntime = this.#runtimeByClient.get(peer.sessionId);
      const peerPlayer = peerRuntime ? this.state.players.get(peerRuntime.playerId) : undefined;
      if (!peerPlayer?.connected || !peerPlayer.alive || peerPlayer.role === 'spectator') continue;
      peer.send(ROOM_MESSAGES.SONAR_EMISSION, emission);
    }
  }

  #lockShot(client: Client, message: unknown): void {
    const runtime = this.#runtimeByClient.get(client.sessionId);
    const parsed = lockShotSchema.safeParse(message);
    const requestSequence = this.#requestSequence(message);
    const now = Date.now();
    const record =
      runtime && parsed.success
        ? this.#sessions.verify(parsed.data.sessionToken, this.roomId, now)
        : null;
    if (!runtime || !parsed.success || !record || record.playerId !== runtime.playerId) {
      this.#sendShotLockRejection(client, requestSequence, now, 'invalid_request');
      return;
    }
    if (this.state.phase !== 'commit') {
      this.#sendShotLockRejection(client, parsed.data.sequence, now, 'wrong_phase');
      return;
    }
    const player = this.state.players.get(runtime.playerId);
    const combatant = this.#combatants.get(runtime.playerId);
    if (!player || !combatant || player.role === 'spectator' || !combatant.alive) {
      this.#sendShotLockRejection(client, parsed.data.sequence, now, 'not_active');
      return;
    }
    if (parsed.data.sequence <= combatant.lockSequence) {
      this.#sendShotLockRejection(client, parsed.data.sequence, now, 'stale_sequence');
      return;
    }

    const replaced = combatant.lockSource === 'explicit';
    combatant.lockedAimAngleRad = parsed.data.aimAngleRad;
    combatant.lockSource = 'explicit';
    combatant.lockSequence = parsed.data.sequence;
    combatant.lockedAtServerMs = now;
    const status: AcceptedShotLockStatusEvent = {
      type: 'shot_lock_status',
      accepted: true,
      requestSequence: parsed.data.sequence,
      lockedAimAngleRad: parsed.data.aimAngleRad,
      lockSource: 'explicit',
      replaced,
      serverTimeMs: now,
    };
    client.send(ROOM_MESSAGES.SHOT_LOCK_STATUS, status);
  }

  #sonarPlayers() {
    return Array.from(this.#combatants.values(), (combatant) => ({
      playerId: combatant.playerId,
      position: { ...combatant.position },
      alive: combatant.alive,
      spectator: this.state.players.get(combatant.playerId)?.role === 'spectator',
    }));
  }

  #requestSequence(message: unknown): number {
    if (typeof message !== 'object' || message === null || !('sequence' in message)) return 0;
    const sequence = (message as { sequence?: unknown }).sequence;
    return typeof sequence === 'number' && Number.isInteger(sequence) && sequence >= 0
      ? sequence
      : 0;
  }

  #simulate(deltaMs: number): void {
    if (this.state.phase === 'commit') {
      if (this.#matchClock.hasExpired(this.state.phaseEndsAtServerMs)) this.#beginResolution();
      return;
    }
    if (this.state.phase === 'recap') {
      if (this.#matchClock.hasExpired(this.state.phaseEndsAtServerMs)) this.#startHunt(false);
      return;
    }
    if (this.state.phase !== 'hunt') return;
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
    if (this.#matchClock.hasExpired(this.state.phaseEndsAtServerMs)) this.#startCommit();
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

  #startHunt(firstRound: boolean): void {
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
    const window = this.#matchClock.huntWindow();
    this.state.phase = 'hunt';
    this.state.phaseStartedAtServerMs = window.startedAtServerMs;
    this.state.phaseEndsAtServerMs = window.endsAtServerMs;
    this.state.activeShooterId = '';
    this.state.nextFirstShooterId = '';
    this.state.recapEntries.clear();
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
      combatant.lockSource = null;
      combatant.lockSequence = -1;
      combatant.lockedAtServerMs = 0;
    }
    this.state.revision += 1;
  }

  #startCommit(): void {
    if (this.state.phase !== 'hunt') return;
    const window = this.#matchClock.commitWindow();
    this.state.phase = 'commit';
    this.state.phaseStartedAtServerMs = window.startedAtServerMs;
    this.state.phaseEndsAtServerMs = window.endsAtServerMs;
    for (const combatant of this.#livingCombatants()) {
      combatant.velocity.x = 0;
      combatant.velocity.y = 0;
      this.#sendPrivateState(combatant);
    }
    this.state.revision += 1;
  }

  #beginResolution(): void {
    if (this.state.phase !== 'commit') return;
    this.state.phase = 'resolution';
    this.state.phaseStartedAtServerMs = Date.now();
    this.state.phaseEndsAtServerMs = 0;
    const combatants = Array.from(this.#combatants.values());
    for (const combatant of combatants) {
      combatant.velocity.x = 0;
      combatant.velocity.y = 0;
      if (combatant.lockSource !== 'explicit') {
        combatant.lockedAimAngleRad = combatant.aimAngleRad;
        combatant.lockSource = 'automatic';
        combatant.lockSequence = Math.max(0, combatant.lockSequence);
        combatant.lockedAtServerMs = Date.now();
        const client = this.#clientForPlayer(combatant.playerId);
        const status = this.#acceptedShotLockStatus(combatant);
        if (client && status) client.send(ROOM_MESSAGES.SHOT_LOCK_STATUS, status);
      }
    }
    this.#combat.separateOverlaps(combatants);
    this.#syncPublicCombatState(true);
    this.state.revision += 1;
    this.#resolveShotAt(0);
  }

  #resolveShotAt(index: number): void {
    if (this.state.phase !== 'resolution') return;
    const shooterId = this.state.firingOrder[index];
    if (!shooterId) {
      this.#finishResolution();
      return;
    }
    const shooter = this.#combatants.get(shooterId);
    if (!shooter) {
      this.clock.setTimeout(
        () => this.#resolveShotAt(index + 1),
        GAMEPLAY_CONFIG.shotResolutionStepMs,
      );
      return;
    }
    this.state.activeShooterId = shooterId;
    this.state.revision += 1;
    this.clock.setTimeout(
      () => this.#fireShotAt(index, shooterId),
      GAMEPLAY_CONFIG.shotAnticipationMs,
    );
  }

  #fireShotAt(index: number, shooterId: string): void {
    if (this.state.phase !== 'resolution' || this.state.activeShooterId !== shooterId) return;
    const shooter = this.#combatants.get(shooterId);
    if (!shooter) {
      this.#resolveShotAt(index + 1);
      return;
    }
    const event = this.#combat.resolveShot(
      shooter,
      Array.from(this.#combatants.values()),
      this.state.roundNumber,
      Date.now(),
    );
    this.#syncPublicCombatState(true);
    this.state.revision += 1;
    const recapEntry = new RecapEntrySchema();
    recapEntry.shotId = event.shotId;
    recapEntry.orderIndex = index;
    recapEntry.shooterId = event.shooterId;
    recapEntry.outcome = event.cancelled ? 'cancelled' : event.targetId ? 'hit' : 'miss';
    recapEntry.targetId = event.targetId ?? '';
    recapEntry.targetHeartsRemaining = event.targetId
      ? (this.#combatants.get(event.targetId)?.hearts ?? -1)
      : -1;
    recapEntry.fatal = event.fatal;
    recapEntry.resolvedAtServerMs = event.resolvedAtServerMs;
    this.state.recapEntries.push(recapEntry);
    this.broadcast(ROOM_MESSAGES.SHOT_RESOLVED, event);
    const winner = this.#livingCombatants();
    if (winner.length === 1) {
      this.clock.setTimeout(
        () => this.#declareWinner(winner[0]!.playerId),
        GAMEPLAY_CONFIG.shotResultHoldMs,
      );
      return;
    }
    const nextShooterDelayMs = Math.max(
      GAMEPLAY_CONFIG.shotResultHoldMs,
      GAMEPLAY_CONFIG.shotResolutionStepMs - GAMEPLAY_CONFIG.shotAnticipationMs,
    );
    this.clock.setTimeout(() => this.#resolveShotAt(index + 1), nextShooterDelayMs);
  }

  #finishResolution(): void {
    if (this.state.phase !== 'resolution') return;
    const living = this.#livingCombatants();
    if (living.length === 1) this.#declareWinner(living[0]!.playerId);
    else this.#startRecap();
  }

  #startRecap(): void {
    if (this.state.phase !== 'resolution') return;
    const window = this.#matchClock.recapWindow();
    this.state.phase = 'recap';
    this.state.phaseStartedAtServerMs = window.startedAtServerMs;
    this.state.phaseEndsAtServerMs = window.endsAtServerMs;
    this.state.activeShooterId = '';
    const nextOrder = this.#order.rotateOne(
      Array.from(this.state.firingOrder).filter((playerId): playerId is string =>
        Boolean(playerId),
      ),
      new Set(this.#livingCombatants().map((combatant) => combatant.playerId)),
    );
    this.state.nextFirstShooterId = nextOrder[0] ?? '';
    this.state.revision += 1;
  }

  #declareWinner(playerId: string): void {
    this.state.phase = 'results';
    this.state.phaseStartedAtServerMs = Date.now();
    this.state.phaseEndsAtServerMs = 0;
    this.state.activeShooterId = '';
    this.state.winnerPlayerId = playerId;
    this.state.nextFirstShooterId = '';
    this.state.revision += 1;
  }

  #syncPublicCombatState(reveal: boolean): void {
    for (const combatant of this.#combatants.values()) {
      const player = this.state.players.get(combatant.playerId);
      if (!player) continue;
      player.hearts = combatant.hearts;
      player.alive = combatant.alive;
      player.lockedAimAngleRad = combatant.lockedAimAngleRad;
      player.revealedX = reveal ? combatant.position.x : -1;
      player.revealedY = reveal ? combatant.position.y : -1;
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

  #acceptedShotLockStatus(combatant: Combatant | undefined): AcceptedShotLockStatusEvent | null {
    if (!combatant?.lockSource) return null;
    return {
      type: 'shot_lock_status',
      accepted: true,
      requestSequence: Math.max(0, combatant.lockSequence),
      lockedAimAngleRad: combatant.lockedAimAngleRad,
      lockSource: combatant.lockSource,
      replaced: false,
      serverTimeMs: combatant.lockedAtServerMs,
    };
  }

  #sendShotLockRejection(
    client: Client,
    requestSequence: number,
    serverTimeMs: number,
    reason: Extract<ShotLockStatusEvent, { accepted: false }>['reason'],
  ): void {
    const status: ShotLockStatusEvent = {
      type: 'shot_lock_status',
      accepted: false,
      requestSequence,
      reason,
      serverTimeMs,
    };
    client.send(ROOM_MESSAGES.SHOT_LOCK_STATUS, status);
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

  #removePlayer(playerId: string): void {
    const departing = this.state.players.get(playerId);
    if (!departing) return;
    for (const [clientSessionId, runtime] of this.#runtimeByClient) {
      if (runtime.playerId !== playerId) continue;
      this.#sessions.revoke(runtime.sessionToken);
      this.#runtimeByClient.delete(clientSessionId);
    }
    this.state.players.delete(playerId);
    this.#combatants.delete(playerId);
    this.#inputRateLimiter.remove(playerId);
    this.#sonar.remove(playerId);
    this.#replaceFiringOrder(
      Array.from(this.state.firingOrder).filter(
        (entry): entry is string => Boolean(entry) && entry !== playerId,
      ),
    );
    if (this.state.activeShooterId === playerId) this.state.activeShooterId = '';
    if (this.state.winnerPlayerId === playerId) this.state.winnerPlayerId = '';
    this.#assignHost();

    if (
      this.state.phase === 'hunt' ||
      this.state.phase === 'commit' ||
      this.state.phase === 'resolution' ||
      this.state.phase === 'recap'
    ) {
      const living = this.#livingCombatants();
      if (living.length === 1) this.#declareWinner(living[0]!.playerId);
      else if (living.length === 0) this.#resetToLobby();
    } else if (this.state.phase === 'results' && !this.state.winnerPlayerId) {
      this.#resetToLobby();
    } else {
      this.state.revision += 1;
    }
  }

  #assignHost(): void {
    const currentHost = this.state.players.get(this.state.hostPlayerId);
    if (currentHost?.connected) return;
    for (const player of this.state.players.values()) {
      player.isHost = false;
      if (player.role === 'host') player.role = 'player';
    }
    const nextHost = Array.from(this.state.players.values()).find(
      (player) => player.connected && player.role !== 'spectator',
    );
    this.state.hostPlayerId = nextHost?.playerId ?? '';
    if (nextHost) {
      nextHost.isHost = true;
      nextHost.role = 'host';
    }
  }

  #resetToLobby(): void {
    this.state.phase = 'lobby';
    this.state.phaseStartedAtServerMs = Date.now();
    this.state.phaseEndsAtServerMs = 0;
    this.state.roundNumber = 0;
    this.state.activeShooterId = '';
    this.state.winnerPlayerId = '';
    this.state.nextFirstShooterId = '';
    this.state.firingOrder.clear();
    this.state.recapEntries.clear();
    this.#combatants.clear();
    const players = Array.from(this.state.players.values());
    players.forEach((player, index) => {
      player.hearts = GAMEPLAY_CONFIG.startingHearts;
      player.alive = true;
      player.isHost = false;
      player.role = 'player';
      player.revealedX = -1;
      player.revealedY = -1;
      player.lockedAimAngleRad = 0;
      this.#combatants.set(player.playerId, this.#createCombatant(player.playerId, index));
    });
    this.state.hostPlayerId = '';
    this.#assignHost();
    this.#sonar.reset();
    this.state.revision += 1;
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
