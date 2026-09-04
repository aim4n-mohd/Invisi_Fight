import { nanoid } from 'nanoid';
import { Room, ServerError } from '@colyseus/core';
import type { Client } from '@colyseus/core';
import { distanceToBoundary, missDistance } from '../services/echoGeometry.js';
import {
  COMMON_GAMEPLAY_CONFIG,
  ECHO_GAMEPLAY_CONFIG,
  GAMEPLAY_CONFIG,
  NETWORK_TICK_MS,
  type AcceptedShotLockStatusEvent,
  type DecoyInputMessage,
  type EchoActionRejectionReason,
  type EchoActionStatusEvent,
  type ErrorEvent,
  type FireInputMessage,
  type GameMode,
  type LockShotMessage,
  type NextMatchInputMessage,
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
  decoyInputSchema,
  fireInputSchema,
  nextMatchInputSchema,
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
import { EchoSoundService } from '../services/EchoSoundService.js';
import { EchoWeaponService } from '../services/EchoWeaponService.js';
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

interface EchoStats {
  shots: number;
  hits: number;
  damage: number;
  eliminations: number;
  sonarDetections: number;
  emittedSound: number;
  closestMissPx: number | null;
  joinedMatchAtMs: number;
  eliminatedAtMs: number | null;
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
  readonly #echoSound = new EchoSoundService();
  readonly #echoWeapon = new EchoWeaponService();
  readonly #matchClock = new MatchClock();
  readonly #inputRateLimiter = new InputRateLimiter();
  #reconnectGraceMs: number = GAMEPLAY_CONFIG.reconnectGraceMs;
  #mode: GameMode = 'echo_hunt';
  #echoStats = new Map<string, EchoStats>();
  #echoReadyQueue: string[] = [];
  #lastFinalEchoAtMs = 0;
  #countdownReturnPhase: 'lobby' | 'results' = 'lobby';
  #echoGeneration = 0;
  #lastNextSequence = new Map<string, number>();
  #lastSonarSequence = new Map<string, number>();

  async onCreate(options: RoomCreationOptions): Promise<void> {
    const roomCode = options.roomCode
      ? this.#auth.validateRoomCode(options.roomCode)
      : createRoomCode();
    this.#mode = options.mode === 'classic' ? 'classic' : 'echo_hunt';
    this.#reconnectGraceMs = options.reconnectGraceMs ?? GAMEPLAY_CONFIG.reconnectGraceMs;
    this.setState(new InvisiFightRoomState(roomCode, this.#mode));
    this.patchRate = 1_000 / GAMEPLAY_CONFIG.networkUpdateHz;
    this.setSeatReservationTime(this.#reconnectGraceMs / 1_000);
    Object.assign(this.listing, { roomCode, mode: this.#mode });
    await this.setMetadata({ roomCode, mode: this.#mode });

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
    this.onMessage<FireInputMessage>(ROOM_MESSAGES.FIRE, (client, message) =>
      this.#fireEcho(client, message),
    );
    this.onMessage<DecoyInputMessage>(ROOM_MESSAGES.DECOY, (client, message) =>
      this.#decoyEcho(client, message),
    );
    this.onMessage<NextMatchInputMessage>(ROOM_MESSAGES.NEXT_MATCH, (client, message) =>
      this.#requestNextMatch(client, message),
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
    if (parsed.data.mode !== this.#mode) {
      throw new ServerError(404, 'That room code could not be found in this mode.');
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
        const combatant = this.#combatants.get(player.playerId);
        if (this.#mode === 'echo_hunt' && combatant && player.inCurrentRoster && combatant.alive)
          this.#sendPrivateState(combatant);
        if (this.#mode === 'echo_hunt') this.#evaluateEchoCountdown();
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
    const activeCount = Array.from(this.state.players.values()).filter(
      (entry) => entry.inCurrentRoster,
    ).length;
    const echoCanSeat =
      this.#mode === 'echo_hunt' &&
      (this.state.phase === 'lobby' ||
        (this.state.phase === 'countdown' && this.#countdownReturnPhase === 'lobby')) &&
      activeCount < COMMON_GAMEPLAY_CONFIG.maxActiveFighters;
    const role =
      this.#mode === 'echo_hunt'
        ? isFirstPlayer
          ? 'host'
          : echoCanSeat
            ? 'player'
            : 'spectator'
        : this.#auth.roleForJoin(this.state.phase, isFirstPlayer, activeCount);
    const publicPlayer = new PublicPlayerSchema();
    publicPlayer.playerId = playerId;
    publicPlayer.displayName = displayName;
    publicPlayer.role = role;
    publicPlayer.isHost = role === 'host';
    publicPlayer.hearts =
      this.#mode === 'echo_hunt'
        ? ECHO_GAMEPLAY_CONFIG.startingHearts
        : GAMEPLAY_CONFIG.startingHearts;
    publicPlayer.alive = role !== 'spectator';
    publicPlayer.inCurrentRoster = role !== 'spectator';
    this.state.players.set(playerId, publicPlayer);
    if (publicPlayer.inCurrentRoster) {
      this.#combatants.set(playerId, this.#createCombatant(playerId, this.state.players.size - 1));
    }
    if (publicPlayer.isHost) this.state.hostPlayerId = playerId;

    const sessionToken = this.#sessions.issue({
      roomId: this.roomId,
      playerId,
      expiresAtMs: Date.now() + 24 * 60 * 60 * 1_000,
    });
    this.#runtimeByClient.set(client.sessionId, {
      playerId,
      sessionToken,
      clientSessionId: client.sessionId,
    });
    this.state.revision += 1;
    this.#sendSession(client);
    if (this.#mode === 'echo_hunt') this.#evaluateEchoCountdown();
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
        combatant.running = false;
      }
    }
    this.state.revision += 1;

    if (this.#mode === 'echo_hunt') {
      this.#assignHost();
      this.#evaluateEchoCountdown();
    }

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
      if (this.#mode === 'echo_hunt') {
        this.#sendSession(restoredClient);
        const combatant = this.#combatants.get(runtime.playerId);
        if (combatant && player?.inCurrentRoster && combatant.alive) {
          this.#sendPrivateState(combatant);
        }
        this.#evaluateEchoCountdown();
      }
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
    this.#echoSound.reset();
    this.#echoWeapon.clear();
    this.#echoStats.clear();
    this.#echoReadyQueue = [];
    this.#lastNextSequence.clear();
    this.#lastSonarSequence.clear();
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
      mode: this.#mode,
      role: player.role,
      isHost: player.isHost,
      sonarReadyAtServerMs:
        this.#mode === 'classic' || (player.inCurrentRoster && player.alive)
          ? this.#sonar.readyAt(runtime.playerId)
          : 0,
      ...(this.#mode === 'echo_hunt'
        ? { nextMatchSequence: this.#lastNextSequence.get(runtime.playerId) ?? -1 }
        : {}),
      ...(this.#mode === 'echo_hunt' && player.inCurrentRoster && player.alive
        ? {
            fireReadyAtServerMs: this.#combatants.get(runtime.playerId)?.fireReadyAtServerMs ?? 0,
            ammo: this.#echoWeapon.snapshot(runtime.playerId).ammo,
            reloadEndsAtServerMs: this.#echoWeapon.snapshot(runtime.playerId).reloadEndsAtServerMs,
            decoyAvailable: this.#combatants.get(runtime.playerId)?.decoyAvailable ?? false,
            actionSequences: {
              fire: this.#combatants.get(runtime.playerId)?.lastFireSequence ?? -1,
              decoy: this.#combatants.get(runtime.playerId)?.lastDecoySequence ?? -1,
              input: this.#combatants.get(runtime.playerId)?.inputSequence ?? 0,
              sonar: this.#lastSonarSequence.get(runtime.playerId) ?? -1,
            },
          }
        : {}),
      shotLockStatus: this.#acceptedShotLockStatus(this.#combatants.get(runtime.playerId)),
      serverTimeMs: Date.now(),
    };
    client.send(ROOM_MESSAGES.SESSION_READY, event);
  }

  #startMatch(client: Client, message: StartMatchMessage): void {
    if (this.#mode !== 'classic') {
      this.#sendError(client, new RoomAuthError('ERR_ROOM_006', 'Echo Hunt starts automatically.'));
      return;
    }
    const runtime = this.#runtimeByClient.get(client.sessionId);
    const record = runtime ? this.#sessions.verify(message.sessionToken, this.roomId) : null;
    const player = record ? this.state.players.get(record.playerId) : null;
    try {
      if (!record || !player || record.playerId !== runtime?.playerId)
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
    if (this.#mode !== 'classic') {
      this.#sendError(client, new RoomAuthError('ERR_ROOM_006', 'Use Play again in Echo Hunt.'));
      return;
    }
    const record = this.#sessions.verify(message.sessionToken, this.roomId);
    if (!record || record.playerId !== this.#runtimeByClient.get(client.sessionId)?.playerId) {
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
      hearts:
        this.#mode === 'echo_hunt'
          ? ECHO_GAMEPLAY_CONFIG.startingHearts
          : GAMEPLAY_CONFIG.startingHearts,
      alive: true,
      velocity: { x: 0, y: 0 },
      inputSequence: 0,
      running: false,
      fireReadyAtServerMs: 0,
      decoyAvailable: this.#mode === 'echo_hunt',
      lastFireSequence: -1,
      lastDecoySequence: -1,
    };
  }

  #applyInput(client: Client, message: PlayerInputMessage): void {
    const echoInputPhase =
      this.#mode === 'echo_hunt' &&
      (this.state.phase === 'lobby' ||
        this.state.phase === 'countdown' ||
        this.state.phase === 'echo_hunt' ||
        this.state.phase === 'final_echo');
    const classicInputPhase =
      this.#mode === 'classic' && (this.state.phase === 'hunt' || this.state.phase === 'commit');
    if (!echoInputPhase && !classicInputPhase) return;
    const runtime = this.#runtimeByClient.get(client.sessionId);
    const parsed = playerInputSchema.safeParse(message);
    if (!runtime || !parsed.success) return;
    const publicPlayer = this.state.players.get(runtime.playerId);
    const combatant = this.#combatants.get(runtime.playerId);
    if (!publicPlayer || !combatant || !publicPlayer.inCurrentRoster || !combatant.alive) return;
    if (!this.#inputRateLimiter.allow(runtime.playerId)) return;
    if (parsed.data.sequence <= combatant.inputSequence) return;
    combatant.inputSequence = parsed.data.sequence;
    combatant.aimAngleRad = parsed.data.aimAngleRad;
    if (this.#mode === 'classic' && this.state.phase === 'commit') {
      combatant.velocity.x = 0;
      combatant.velocity.y = 0;
      this.#sendPrivateState(combatant);
      return;
    }
    const magnitude = Math.hypot(parsed.data.moveX, parsed.data.moveY);
    const scale = magnitude > 1 ? 1 / magnitude : 1;
    combatant.running = this.#mode === 'echo_hunt' && parsed.data.running;
    const speed =
      this.#mode === 'echo_hunt'
        ? combatant.running
          ? ECHO_GAMEPLAY_CONFIG.runSpeedPxPerSecond
          : ECHO_GAMEPLAY_CONFIG.walkSpeedPxPerSecond
        : GAMEPLAY_CONFIG.playerSpeedPxPerSecond;
    combatant.velocity.x = parsed.data.moveX * scale * speed;
    combatant.velocity.y = parsed.data.moveY * scale * speed;
  }

  #triggerSonar(client: Client, message: unknown): void {
    const runtime = this.#runtimeByClient.get(client.sessionId);
    const actor = runtime ? this.state.players.get(runtime.playerId) : undefined;
    if (this.#mode === 'echo_hunt' && (!actor?.inCurrentRoster || !actor.alive)) {
      this.#sendError(
        client,
        new RoomAuthError('ERR_ACTION', 'Spectating: actions are unavailable.'),
      );
      return;
    }
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
      if (this.#mode === 'echo_hunt') {
        this.#sendEchoStatus(client, 'sonar', requestSequence, false, 'invalid_request');
      }
      return;
    }

    if (this.#mode === 'echo_hunt') {
      if (parsed.data.sequence <= (this.#lastSonarSequence.get(runtime.playerId) ?? -1)) {
        this.#sendEchoStatus(client, 'sonar', parsed.data.sequence, false, 'stale_sequence');
        return;
      }
      this.#lastSonarSequence.set(runtime.playerId, parsed.data.sequence);
      if (!this.#inputRateLimiter.allow(`sonar:${runtime.playerId}`, now)) return;
    }
    const activation = this.#sonar.activate(
      this.#sonarPlayers(),
      runtime.playerId,
      this.state.phase,
      now,
      this.#mode === 'echo_hunt'
        ? {
            allowedPhases: ['lobby', 'countdown', 'echo_hunt', 'final_echo'],
            cooldownMs: ECHO_GAMEPLAY_CONFIG.sonarCooldownMs,
            radiusPx: ECHO_GAMEPLAY_CONFIG.sonarPulseRadiusPx,
            snapshotDurationMs: ECHO_GAMEPLAY_CONFIG.sonarSnapshotDurationMs,
            originQuantizationPx: ECHO_GAMEPLAY_CONFIG.sonarOriginQuantizationPx,
          }
        : undefined,
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
      if (this.#mode === 'echo_hunt') {
        this.#sendEchoStatus(
          client,
          'sonar',
          parsed.data.sequence,
          false,
          activation.reason === 'not_active' ? 'not_active' : activation.reason,
        );
      }
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
    if (this.#mode === 'echo_hunt') {
      this.#sendEchoNoise(runtime.playerId, ECHO_GAMEPLAY_CONFIG.sonarIntensity, now);
      const stats = this.#echoStats.get(runtime.playerId);
      if (stats && (this.state.phase === 'echo_hunt' || this.state.phase === 'final_echo')) {
        stats.sonarDetections += activation.detections.length;
        stats.emittedSound += ECHO_GAMEPLAY_CONFIG.sonarIntensity;
      }
      this.#sendEchoStatus(client, 'sonar', parsed.data.sequence, true);
    }

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
      radius:
        this.#mode === 'echo_hunt'
          ? ECHO_GAMEPLAY_CONFIG.sonarPulseRadiusPx
          : GAMEPLAY_CONFIG.sonarPulseRadiusPx,
      emittedAtServerMs: activation.activatedAtServerMs,
      expiresAtServerMs:
        activation.activatedAtServerMs +
        (this.#mode === 'echo_hunt'
          ? ECHO_GAMEPLAY_CONFIG.sonarPulseVisualDurationMs
          : GAMEPLAY_CONFIG.sonarPulseVisualDurationMs),
    };
    for (const peer of this.clients) {
      if (this.#mode === 'classic' && peer.sessionId === client.sessionId) continue;
      const peerRuntime = this.#runtimeByClient.get(peer.sessionId);
      const peerPlayer = peerRuntime ? this.state.players.get(peerRuntime.playerId) : undefined;
      if (!peerPlayer?.connected) continue;
      if (this.#mode === 'classic' && (!peerPlayer.alive || peerPlayer.role === 'spectator'))
        continue;
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

  #fireEcho(client: Client, message: unknown): void {
    const now = Date.now();
    const runtime = this.#runtimeByClient.get(client.sessionId);
    const parsed = fireInputSchema.safeParse(message);
    const requestSequence = this.#requestSequence(message);
    if (
      !runtime ||
      !parsed.success ||
      !this.#validRuntimeToken(runtime, parsed.data.sessionToken, now)
    ) {
      this.#sendEchoStatus(client, 'fire', requestSequence, false, 'invalid_request');
      return;
    }
    if (this.#mode !== 'echo_hunt') {
      this.#sendEchoStatus(client, 'fire', parsed.data.sequence, false, 'wrong_mode');
      return;
    }
    if (!['lobby', 'countdown', 'echo_hunt', 'final_echo'].includes(this.state.phase)) {
      this.#sendEchoStatus(client, 'fire', parsed.data.sequence, false, 'wrong_phase');
      return;
    }
    const player = this.state.players.get(runtime.playerId);
    const shooter = this.#combatants.get(runtime.playerId);
    if (!player?.inCurrentRoster || !shooter) {
      this.#sendEchoStatus(client, 'fire', parsed.data.sequence, false, 'not_active');
      return;
    }
    if (!shooter.alive) {
      this.#sendEchoStatus(client, 'fire', parsed.data.sequence, false, 'eliminated');
      return;
    }
    if (parsed.data.sequence <= shooter.lastFireSequence) {
      this.#sendEchoStatus(client, 'fire', parsed.data.sequence, false, 'stale_sequence');
      return;
    }
    shooter.lastFireSequence = parsed.data.sequence;
    if (!this.#inputRateLimiter.allow(`fire:${runtime.playerId}`, now)) return;
    if (now < shooter.fireReadyAtServerMs) {
      this.#sendEchoStatus(client, 'fire', parsed.data.sequence, false, 'cooldown');
      return;
    }
    this.#advanceEchoReload(runtime.playerId, now);
    const weaponRejection = this.#echoWeapon.fire(runtime.playerId, now);
    if (weaponRejection) {
      this.#sendEchoStatus(client, 'fire', parsed.data.sequence, false, weaponRejection);
      return;
    }
    shooter.fireReadyAtServerMs = now + ECHO_GAMEPLAY_CONFIG.fireCooldownMs;
    const damaging = this.state.phase === 'echo_hunt' || this.state.phase === 'final_echo';
    const event = this.#combat.resolveShot(
      shooter,
      damaging ? this.#livingCombatants() : [shooter],
      this.state.roundNumber,
      now,
      {
        aimAngleRad: parsed.data.aimAngleRad,
        hitRadiusPx: ECHO_GAMEPLAY_CONFIG.shotHitRadiusPx,
        includeOriginOverlap: true,
        rangePx: distanceToBoundary(shooter.position, parsed.data.aimAngleRad),
        requestSequence: parsed.data.sequence,
      },
    );
    const stats = this.#echoStats.get(runtime.playerId);
    if (damaging && stats) {
      stats.shots += 1;
      stats.emittedSound += ECHO_GAMEPLAY_CONFIG.gunshotIntensity;
      if (event.targetId) {
        stats.hits += 1;
        stats.damage += 1;
        if (event.fatal) stats.eliminations += 1;
      } else {
        const distances = this.#livingCombatants()
          .filter((entry) => entry.playerId !== shooter.playerId)
          .map((entry) =>
            missDistance(
              event.origin,
              event.end,
              entry.position,
              ECHO_GAMEPLAY_CONFIG.shotHitRadiusPx,
            ),
          );
        if (distances.length)
          stats.closestMissPx = Math.min(stats.closestMissPx ?? Infinity, ...distances);
      }
    }
    if (event.targetId) {
      const target = this.#combatants.get(event.targetId);
      const targetPlayer = this.state.players.get(event.targetId);
      if (target && targetPlayer) {
        targetPlayer.hearts = target.hearts;
        targetPlayer.alive = target.alive;
        if (!target.alive) {
          target.velocity = { x: 0, y: 0 };
          const targetStats = this.#echoStats.get(event.targetId);
          if (targetStats) targetStats.eliminatedAtMs = now;
        }
      }
    }
    this.broadcast(ROOM_MESSAGES.SHOT_RESOLVED, event);
    this.#sendEchoNoise(runtime.playerId, ECHO_GAMEPLAY_CONFIG.gunshotIntensity, now);
    this.state.revision += 1;
    this.#sendEchoStatus(client, 'fire', parsed.data.sequence, true);
    if (damaging) {
      const living = this.#livingCombatants();
      if (living.length === 1) {
        const generation = this.#echoGeneration;
        this.clock.setTimeout(() => {
          if (generation === this.#echoGeneration && this.state.phase !== 'results') {
            const remaining = this.#livingCombatants();
            if (remaining.length <= 1) this.#declareEchoWinner(remaining[0]?.playerId ?? '');
          }
        }, ECHO_GAMEPLAY_CONFIG.resultsImpactHoldMs);
      }
    }
  }

  #decoyEcho(client: Client, message: unknown): void {
    const now = Date.now();
    const runtime = this.#runtimeByClient.get(client.sessionId);
    const parsed = decoyInputSchema.safeParse(message);
    const requestSequence = this.#requestSequence(message);
    if (
      !runtime ||
      !parsed.success ||
      !this.#validRuntimeToken(runtime, parsed.data.sessionToken, now)
    ) {
      this.#sendEchoStatus(client, 'decoy', requestSequence, false, 'invalid_request');
      return;
    }
    if (this.#mode !== 'echo_hunt') {
      this.#sendEchoStatus(client, 'decoy', parsed.data.sequence, false, 'wrong_mode');
      return;
    }
    if (!['lobby', 'countdown', 'echo_hunt', 'final_echo'].includes(this.state.phase)) {
      this.#sendEchoStatus(client, 'decoy', parsed.data.sequence, false, 'wrong_phase');
      return;
    }
    const player = this.state.players.get(runtime.playerId);
    const combatant = this.#combatants.get(runtime.playerId);
    if (!player?.inCurrentRoster || !combatant) {
      this.#sendEchoStatus(client, 'decoy', parsed.data.sequence, false, 'not_active');
      return;
    }
    if (!combatant.alive) {
      this.#sendEchoStatus(client, 'decoy', parsed.data.sequence, false, 'eliminated');
      return;
    }
    if (parsed.data.sequence <= combatant.lastDecoySequence) {
      this.#sendEchoStatus(client, 'decoy', parsed.data.sequence, false, 'stale_sequence');
      return;
    }
    combatant.lastDecoySequence = parsed.data.sequence;
    if (!this.#inputRateLimiter.allow(`decoy:${runtime.playerId}`, now)) return;
    const practice = this.state.phase === 'lobby' || this.state.phase === 'countdown';
    if (!practice && !combatant.decoyAvailable) {
      this.#sendEchoStatus(client, 'decoy', parsed.data.sequence, false, 'unavailable_decoy');
      return;
    }
    if (!practice) combatant.decoyAvailable = false;
    const generation = this.#echoGeneration;
    const trail = this.#echoSound.decoyTrail(combatant.position, parsed.data.aimAngleRad, now);
    trail.forEach((cue, index) => {
      this.clock.setTimeout(
        () => {
          if (
            generation !== this.#echoGeneration ||
            this.#mode !== 'echo_hunt' ||
            this.#combatants.get(runtime.playerId) !== combatant
          )
            return;
          this.broadcast(ROOM_MESSAGES.SOUND_CUE, cue);
          this.#sendEchoNoise(runtime.playerId, cue.intensity, cue.emittedAtServerMs);
        },
        Math.max(0, cue.emittedAtServerMs - now),
      );
      if (!practice && index === 0) {
        const stats = this.#echoStats.get(runtime.playerId);
        if (stats) stats.emittedSound += cue.intensity * trail.length;
      }
    });
    this.#sendEchoStatus(client, 'decoy', parsed.data.sequence, true);
  }

  #requestNextMatch(client: Client, message: unknown): void {
    const now = Date.now();
    const runtime = this.#runtimeByClient.get(client.sessionId);
    const parsed = nextMatchInputSchema.safeParse(message);
    const requestSequence = this.#requestSequence(message);
    if (
      !runtime ||
      !parsed.success ||
      !this.#validRuntimeToken(runtime, parsed.data.sessionToken, now)
    ) {
      this.#sendEchoStatus(client, 'next_match', requestSequence, false, 'invalid_request');
      return;
    }
    if (this.#mode !== 'echo_hunt') {
      this.#sendEchoStatus(client, 'next_match', parsed.data.sequence, false, 'wrong_mode');
      return;
    }
    if (
      this.state.phase !== 'results' &&
      !(this.state.phase === 'countdown' && this.#countdownReturnPhase === 'results')
    ) {
      this.#sendEchoStatus(client, 'next_match', parsed.data.sequence, false, 'wrong_phase');
      return;
    }
    const previousSequence = this.#lastNextSequence.get(runtime.playerId) ?? -1;
    if (parsed.data.sequence <= previousSequence) {
      this.#sendEchoStatus(client, 'next_match', parsed.data.sequence, false, 'stale_sequence');
      return;
    }
    this.#lastNextSequence.set(runtime.playerId, parsed.data.sequence);
    if (!this.#inputRateLimiter.allow(`next:${runtime.playerId}`, now)) return;
    const player = this.state.players.get(runtime.playerId);
    if (!player) return;
    if (parsed.data.ready) {
      if (!this.#echoReadyQueue.includes(player.playerId)) {
        if (this.#echoReadyQueue.length >= COMMON_GAMEPLAY_CONFIG.maxActiveFighters) {
          this.#sendEchoStatus(client, 'next_match', parsed.data.sequence, false, 'not_active');
          return;
        }
        this.#echoReadyQueue.push(player.playerId);
      }
    } else {
      this.#echoReadyQueue = this.#echoReadyQueue.filter((id) => id !== player.playerId);
    }
    player.readyForNextMatch = parsed.data.ready;
    this.#sendEchoStatus(client, 'next_match', parsed.data.sequence, true);
    if (this.state.phase === 'results' && this.#readyConnectedCount() >= 2) {
      this.#beginEchoCountdown('results');
    } else if (this.state.phase === 'countdown' && this.#readyConnectedCount() < 2) {
      this.state.phase = 'results';
      this.state.phaseStartedAtServerMs = now;
      this.state.phaseEndsAtServerMs = 0;
    }
    this.state.revision += 1;
  }

  #readyConnectedCount(): number {
    return this.#echoReadyQueue.filter((playerId) => this.state.players.get(playerId)?.connected)
      .length;
  }

  #validRuntimeToken(runtime: RuntimePlayer, token: string, now: number): boolean {
    const record = this.#sessions.verify(token, this.roomId, now);
    return Boolean(record && record.playerId === runtime.playerId);
  }

  #sendEchoNoise(playerId: string, intensity: number, emittedAtServerMs: number): void {
    const player = this.state.players.get(playerId);
    if (!player?.inCurrentRoster || !player.alive) return;
    this.#clientForPlayer(playerId)?.send('private:echo-noise', {
      type: 'echo_noise',
      noiseId: nanoid(12),
      intensity,
      emittedAtServerMs,
    });
  }

  #advanceEchoReload(playerId: string, now: number): void {
    const { clicks, completed } = this.#echoWeapon.advanceReload(playerId, now);
    const combatant = this.#combatants.get(playerId);
    if (!combatant) return;
    for (let i = 0; i < clicks; i++) {
      const cue = this.#echoSound.createCue('reload', combatant.position, now);
      this.broadcast(ROOM_MESSAGES.SOUND_CUE, cue);
      this.#sendEchoNoise(playerId, cue.intensity, now);
      const stats = this.#echoStats.get(playerId);
      if (stats && (this.state.phase === 'echo_hunt' || this.state.phase === 'final_echo')) {
        stats.emittedSound += cue.intensity;
      }
    }
    const client = this.#clientForPlayer(playerId);
    if (completed && client) this.#sendEchoStatus(client, 'reload', 0, true);
  }

  #sendEchoStatus(
    client: Client,
    action: EchoActionStatusEvent['action'],
    requestSequence: number,
    accepted: boolean,
    reason?: EchoActionRejectionReason,
  ): void {
    const runtime = this.#runtimeByClient.get(client.sessionId);
    const combatant = runtime ? this.#combatants.get(runtime.playerId) : undefined;
    const player = runtime ? this.state.players.get(runtime.playerId) : undefined;
    if (this.#mode !== 'echo_hunt' || !player?.inCurrentRoster || !player.alive || !combatant) {
      if (!accepted)
        this.#sendError(client, new RoomAuthError('ERR_ACTION', reason ?? 'Action unavailable.'));
      return;
    }
    const base = {
      type: 'echo_action_status' as const,
      action,
      requestSequence,
      fireReadyAtServerMs: combatant?.fireReadyAtServerMs ?? 0,
      ammo: this.#echoWeapon.snapshot(runtime!.playerId).ammo,
      reloadEndsAtServerMs: this.#echoWeapon.snapshot(runtime!.playerId).reloadEndsAtServerMs,
      sonarReadyAtServerMs: runtime ? this.#sonar.readyAt(runtime.playerId) : 0,
      decoyAvailable: combatant?.decoyAvailable ?? false,
      serverTimeMs: Date.now(),
    };
    const event: EchoActionStatusEvent = accepted
      ? { ...base, accepted: true }
      : { ...base, accepted: false, reason: reason ?? 'invalid_request' };
    client.send(ROOM_MESSAGES.ECHO_ACTION_STATUS, event);
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
    if (this.#mode === 'echo_hunt') {
      this.#simulateEcho(deltaMs);
      return;
    }
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

  #simulateEcho(deltaMs: number): void {
    const phase = this.state.phase;
    if (phase === 'countdown' && this.#matchClock.hasExpired(this.state.phaseEndsAtServerMs)) {
      this.#startEchoMatch();
    }
    if (
      phase !== 'lobby' &&
      phase !== 'countdown' &&
      phase !== 'echo_hunt' &&
      phase !== 'final_echo'
    ) {
      return;
    }
    const deltaSeconds = Math.min(deltaMs, 250) / 1_000;
    const radius = ECHO_GAMEPLAY_CONFIG.playerRadius;
    const now = Date.now();
    for (const combatant of this.#combatants.values()) {
      const player = this.state.players.get(combatant.playerId);
      if (!player?.inCurrentRoster || !combatant.alive) continue;
      this.#advanceEchoReload(combatant.playerId, now);
      const previous = { ...combatant.position };
      combatant.position.x = Math.min(
        COMMON_GAMEPLAY_CONFIG.arenaWidth - radius,
        Math.max(radius, combatant.position.x + combatant.velocity.x * deltaSeconds),
      );
      combatant.position.y = Math.min(
        COMMON_GAMEPLAY_CONFIG.arenaHeight - radius,
        Math.max(radius, combatant.position.y + combatant.velocity.y * deltaSeconds),
      );
      const cue = this.#echoSound.recordMovement(
        combatant.playerId,
        previous,
        combatant.position,
        combatant.running,
        now,
      );
      if (cue) {
        this.broadcast(ROOM_MESSAGES.SOUND_CUE, cue);
        this.#sendEchoNoise(combatant.playerId, cue.intensity, now);
        const stats = this.#echoStats.get(combatant.playerId);
        if (stats && (phase === 'echo_hunt' || phase === 'final_echo')) {
          stats.emittedSound += cue.intensity;
        }
      }
      this.#sendPrivateState(combatant);
    }
    if (phase === 'echo_hunt' && this.#matchClock.hasExpired(this.state.phaseEndsAtServerMs)) {
      this.#startFinalEcho();
    } else if (
      phase === 'final_echo' &&
      now - this.#lastFinalEchoAtMs >= ECHO_GAMEPLAY_CONFIG.finalEchoIntervalMs
    ) {
      this.#lastFinalEchoAtMs = now;
      for (const combatant of this.#livingCombatants()) {
        this.broadcast(
          ROOM_MESSAGES.SOUND_CUE,
          this.#echoSound.createCue('final_echo', combatant.position, now),
        );
      }
    }
  }

  #evaluateEchoCountdown(): void {
    if (this.#mode !== 'echo_hunt') return;
    const rematch =
      this.state.phase === 'results' ||
      (this.state.phase === 'countdown' && this.#countdownReturnPhase === 'results');
    const connectedSeats = rematch
      ? this.#readyConnectedCount()
      : this.#connectedEchoRoster().length;
    if (
      this.state.phase === 'countdown' &&
      connectedSeats < COMMON_GAMEPLAY_CONFIG.minPlayersToStart
    ) {
      this.state.phase = this.#countdownReturnPhase;
      this.state.phaseStartedAtServerMs = Date.now();
      this.state.phaseEndsAtServerMs = 0;
      this.state.revision += 1;
      return;
    }
    if (
      (this.state.phase === 'lobby' || this.state.phase === 'results') &&
      connectedSeats >= COMMON_GAMEPLAY_CONFIG.minPlayersToStart
    ) {
      this.#beginEchoCountdown(this.state.phase);
    }
  }

  #beginEchoCountdown(returnPhase: 'lobby' | 'results'): void {
    if (this.state.phase === 'countdown') return;
    const now = Date.now();
    this.#countdownReturnPhase = returnPhase;
    this.state.phase = 'countdown';
    this.state.phaseStartedAtServerMs = now;
    this.state.phaseEndsAtServerMs = now + ECHO_GAMEPLAY_CONFIG.countdownDurationMs;
    this.state.revision += 1;
  }

  #startEchoMatch(): void {
    if (this.state.phase !== 'countdown') return;
    let roster = this.#connectedEchoRoster();
    if (this.#countdownReturnPhase === 'results') {
      roster = this.#echoReadyQueue
        .map((playerId) => this.state.players.get(playerId))
        .filter((player): player is PublicPlayerSchema => Boolean(player?.connected))
        .slice(0, COMMON_GAMEPLAY_CONFIG.maxActiveFighters);
    }
    if (roster.length < COMMON_GAMEPLAY_CONFIG.minPlayersToStart) {
      this.state.phase = this.#countdownReturnPhase;
      this.state.phaseEndsAtServerMs = 0;
      this.state.revision += 1;
      return;
    }
    const now = Date.now();
    const rosterIds = new Set(roster.map((player) => player.playerId));
    this.#echoGeneration += 1;
    const previousCombatants = new Map(this.#combatants);
    this.#combatants.clear();
    this.#echoStats.clear();
    this.#sonar.reset();
    this.#echoSound.reset();
    for (const player of this.state.players.values()) {
      player.inCurrentRoster = rosterIds.has(player.playerId);
      player.readyForNextMatch = false;
      player.alive = player.inCurrentRoster;
      player.hearts = player.inCurrentRoster ? ECHO_GAMEPLAY_CONFIG.startingHearts : 0;
      player.role = player.inCurrentRoster ? (player.isHost ? 'host' : 'player') : 'spectator';
      player.revealedX = -1;
      player.revealedY = -1;
      player.lockedAimAngleRad = 0;
      player.award = '';
      player.resultStats.shots = 0;
      player.resultStats.hits = 0;
      player.resultStats.damage = 0;
      player.resultStats.eliminations = 0;
      player.resultStats.sonarDetections = 0;
      player.resultStats.emittedSound = 0;
      player.resultStats.closestMissPx = -1;
      player.resultStats.survivalMs = 0;
    }
    roster.forEach((player, index) => {
      this.#echoWeapon.resetMagazine(player.playerId);
      const combatant = this.#createCombatant(player.playerId, index);
      const previous = previousCombatants.get(player.playerId);
      combatant.lastFireSequence = previous?.lastFireSequence ?? -1;
      combatant.lastDecoySequence = previous?.lastDecoySequence ?? -1;
      combatant.inputSequence = previous?.inputSequence ?? 0;
      const angle = (index * Math.PI * 2) / roster.length - Math.PI / 2;
      combatant.position = {
        x: COMMON_GAMEPLAY_CONFIG.arenaWidth / 2 + Math.cos(angle) * 190,
        y: COMMON_GAMEPLAY_CONFIG.arenaHeight / 2 + Math.sin(angle) * 190,
      };
      combatant.aimAngleRad = angle + Math.PI;
      combatant.lockedAimAngleRad = angle + Math.PI;
      this.#combatants.set(player.playerId, combatant);
      this.#echoStats.set(player.playerId, {
        shots: 0,
        hits: 0,
        damage: 0,
        eliminations: 0,
        sonarDetections: 0,
        emittedSound: 0,
        closestMissPx: null,
        joinedMatchAtMs: now,
        eliminatedAtMs: null,
      });
      this.#sendPrivateState(combatant);
      const client = this.#clientForPlayer(player.playerId);
      if (client) this.#sendEchoStatus(client, 'next_match', 0, true);
    });
    this.#echoReadyQueue = [];
    this.state.roundNumber += 1;
    this.state.phase = 'echo_hunt';
    this.state.phaseStartedAtServerMs = now;
    this.state.phaseEndsAtServerMs = now + ECHO_GAMEPLAY_CONFIG.huntDurationMs;
    this.state.winnerPlayerId = '';
    this.#lastFinalEchoAtMs = 0;
    this.state.revision += 1;
  }

  #startFinalEcho(): void {
    if (this.state.phase !== 'echo_hunt') return;
    const now = Date.now();
    this.state.phase = 'final_echo';
    this.state.phaseStartedAtServerMs = now;
    this.state.phaseEndsAtServerMs = 0;
    this.#lastFinalEchoAtMs = now - ECHO_GAMEPLAY_CONFIG.finalEchoIntervalMs;
    this.state.revision += 1;
  }

  #connectedEchoRoster(): PublicPlayerSchema[] {
    return Array.from(this.state.players.values()).filter(
      (player) => player.inCurrentRoster && player.connected,
    );
  }

  #sendPrivateState(combatant: Combatant): void {
    if (
      this.#mode === 'echo_hunt' &&
      (!combatant.alive || !this.state.players.get(combatant.playerId)?.inCurrentRoster)
    )
      return;
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

  #declareEchoWinner(playerId: string): void {
    if (
      this.#mode !== 'echo_hunt' ||
      (this.state.phase !== 'echo_hunt' && this.state.phase !== 'final_echo')
    )
      return;
    const now = Date.now();
    const winner = this.state.players.get(playerId);
    if (winner) winner.rivalryWins += 1;
    this.state.phase = 'results';
    this.state.phaseStartedAtServerMs = now;
    this.state.phaseEndsAtServerMs = 0;
    this.state.winnerPlayerId = playerId;
    this.#echoGeneration += 1;
    this.#echoReadyQueue = [];
    for (const player of this.state.players.values()) {
      player.readyForNextMatch = false;
      const combatant = this.#combatants.get(player.playerId);
      if (combatant) combatant.velocity = { x: 0, y: 0 };
      const stats = this.#echoStats.get(player.playerId);
      if (!stats) continue;
      player.resultStats.shots = stats.shots;
      player.resultStats.hits = stats.hits;
      player.resultStats.damage = stats.damage;
      player.resultStats.eliminations = stats.eliminations;
      player.resultStats.sonarDetections = stats.sonarDetections;
      player.resultStats.emittedSound = Math.round(stats.emittedSound * 100) / 100;
      player.resultStats.closestMissPx = stats.closestMissPx ?? -1;
      player.resultStats.survivalMs = (stats.eliminatedAtMs ?? now) - stats.joinedMatchAtMs;
      player.award = '';
    }
    const participants = Array.from(this.state.players.values()).filter(
      (player) => player.inCurrentRoster,
    );
    const mostAccurate = [...participants].sort((left, right) => {
      const leftAccuracy = left.resultStats.shots
        ? left.resultStats.hits / left.resultStats.shots
        : 0;
      const rightAccuracy = right.resultStats.shots
        ? right.resultStats.hits / right.resultStats.shots
        : 0;
      return rightAccuracy - leftAccuracy || left.playerId.localeCompare(right.playerId);
    })[0];
    if (mostAccurate && mostAccurate.resultStats.hits > 0) mostAccurate.award = 'Sharpest shot';
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
        combatant.alive &&
        (this.#mode === 'echo_hunt'
          ? this.state.players.get(combatant.playerId)?.inCurrentRoster
          : this.state.players.get(combatant.playerId)?.role !== 'spectator'),
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
    this.#echoSound.resetPlayer(playerId);
    this.#echoWeapon.remove(playerId);
    this.#echoStats.delete(playerId);
    this.#echoReadyQueue = this.#echoReadyQueue.filter((id) => id !== playerId);
    this.#lastNextSequence.delete(playerId);
    this.#lastSonarSequence.delete(playerId);
    for (const action of ['fire', 'decoy', 'sonar', 'next'])
      this.#inputRateLimiter.remove(`${action}:${playerId}`);
    this.#replaceFiringOrder(
      Array.from(this.state.firingOrder).filter(
        (entry): entry is string => Boolean(entry) && entry !== playerId,
      ),
    );
    if (this.state.activeShooterId === playerId) this.state.activeShooterId = '';
    if (this.state.winnerPlayerId === playerId) this.state.winnerPlayerId = '';
    this.#assignHost();

    if (this.#mode === 'echo_hunt') {
      if (this.state.phase === 'countdown') {
        this.#evaluateEchoCountdown();
      } else if (this.state.phase === 'echo_hunt' || this.state.phase === 'final_echo') {
        const living = this.#livingCombatants();
        if (living.length === 1) this.#declareEchoWinner(living[0]!.playerId);
        else if (living.length === 0) this.#declareEchoWinner('');
      } else if (this.state.phase === 'results') {
        this.state.revision += 1;
      } else {
        this.state.revision += 1;
      }
      return;
    }

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
      (player) => player.connected && (this.#mode === 'echo_hunt' || player.role !== 'spectator'),
    );
    this.state.hostPlayerId = nextHost?.playerId ?? '';
    if (nextHost) {
      nextHost.isHost = true;
      if (nextHost.inCurrentRoster) nextHost.role = 'host';
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
    const players = Array.from(this.state.players.values()).sort(
      (left, right) => Number(right.inCurrentRoster) - Number(left.inCurrentRoster),
    );
    let activeIndex = 0;
    players.forEach((player) => {
      const active = player.connected && activeIndex < COMMON_GAMEPLAY_CONFIG.maxActiveFighters;
      player.hearts = GAMEPLAY_CONFIG.startingHearts;
      player.alive = active;
      player.isHost = false;
      player.role = active ? 'player' : 'spectator';
      player.inCurrentRoster = active;
      player.readyForNextMatch = false;
      player.revealedX = -1;
      player.revealedY = -1;
      player.lockedAimAngleRad = 0;
      if (active) {
        this.#combatants.set(player.playerId, this.#createCombatant(player.playerId, activeIndex));
        activeIndex += 1;
      }
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
