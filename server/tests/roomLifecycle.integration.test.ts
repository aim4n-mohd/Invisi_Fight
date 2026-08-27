import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Client as ColyseusClient, type Room } from 'colyseus.js';
import type { Server } from '@colyseus/core';
import type { Server as HttpServer } from 'node:http';
import {
  GAMEPLAY_CONFIG,
  type PrivatePlayerStateEvent,
  type PrivateSonarSnapshotEvent,
  type PublicSonarEmissionEvent,
  type SessionReadyEvent,
  type ShotResolutionEvent,
  type ShotLockStatusEvent,
  type SonarStatusEvent,
} from '@invisi-fight/shared';
import { assembleServer } from '../src/app.js';
import { readEnvironment } from '../src/config/env.js';

interface LifecycleWireState {
  phase: string;
  roomCode: string;
  firingOrder: Iterable<string>;
  nextFirstShooterId: string;
  recapEntries: Iterable<{
    shotId: string;
    orderIndex: number;
    shooterId: string;
    outcome: string;
    targetId: string;
    targetHeartsRemaining: number;
    fatal: boolean;
    resolvedAtServerMs: number;
  }>;
  players: {
    get: (playerId: string) =>
      | {
          role: string;
          connected: boolean;
          hearts: number;
          lockedAimAngleRad: number;
          revealedX: number;
          revealedY: number;
        }
      | undefined;
  };
}

async function sessionFor(room: Room<LifecycleWireState>): Promise<SessionReadyEvent> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('session event timed out')), 3_000);
    room.onMessage<SessionReadyEvent>('session:ready', (event) => {
      clearTimeout(timeout);
      resolve(event);
    });
    room.send('session:request');
  });
}

async function waitFor(predicate: () => boolean, timeoutMs = 3_000): Promise<void> {
  const deadline = performance.now() + timeoutMs;
  while (!predicate()) {
    if (performance.now() >= deadline) throw new Error('state transition timed out');
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

describe('InvisiFightRoom lifecycle', () => {
  let gameServer: Server;
  let httpServer: HttpServer;
  let client: ColyseusClient;
  const rooms: Array<Room<LifecycleWireState>> = [];

  beforeAll(async () => {
    const assembled = assembleServer(
      readEnvironment({
        NODE_ENV: 'test',
        SERVER_HOST: '127.0.0.1',
        ENABLE_DEV_MODE: 'false',
        MATCH_RECONNECT_GRACE_MS: '100',
      }),
    );
    gameServer = assembled.gameServer;
    httpServer = assembled.httpServer;
    await gameServer.listen(0, '127.0.0.1');
    const address = httpServer.address() as AddressInfo;
    client = new ColyseusClient(`ws://127.0.0.1:${address.port}`);
  });

  afterAll(async () => {
    await Promise.allSettled(
      rooms.filter((room) => room.connection.isOpen).map((room) => room.leave(true)),
    );
    await gameServer.gracefullyShutdown(false);
  });

  it('creates, joins, starts, assigns a late spectator, and reconnects identity', async () => {
    const hostRoom = await client.create<LifecycleWireState>('invisi_fight', {
      playerName: 'Host',
    });
    rooms.push(hostRoom);
    hostRoom.onMessage('private:state', () => undefined);
    hostRoom.onMessage('private:sonar', () => undefined);
    const hostSession = await sessionFor(hostRoom);
    await waitFor(() => Boolean(hostRoom.state?.roomCode));
    expect(hostRoom.state.roomCode).toMatch(/^[A-Z2-9]{6}$/);
    await waitFor(() => hostRoom.state.players.get(hostSession.playerId)?.role === 'host');
    expect(hostRoom.state.players.get(hostSession.playerId)?.role).toBe('host');

    const guestRoom = await client.join<LifecycleWireState>('invisi_fight', {
      playerName: 'Guest',
      roomCode: hostRoom.state.roomCode,
    });
    rooms.push(guestRoom);
    guestRoom.onMessage('private:state', () => undefined);
    guestRoom.onMessage('private:sonar', () => undefined);
    const guestSession = await sessionFor(guestRoom);
    await waitFor(() => hostRoom.state.players.get(guestSession.playerId)?.role === 'player');

    hostRoom.send('input:start', { sessionToken: hostSession.sessionToken });
    await waitFor(() => hostRoom.state.phase === 'hunt');
    expect(guestRoom.state.phase).toBe('hunt');

    const lateRoom = await client.join<LifecycleWireState>('invisi_fight', {
      playerName: 'Late',
      roomCode: hostRoom.state.roomCode,
    });
    rooms.push(lateRoom);
    const lateSession = await sessionFor(lateRoom);
    expect(lateRoom.state.players.get(lateSession.playerId)?.role).toBe('spectator');

    const reconnectToken = guestRoom.reconnectionToken;
    await guestRoom.leave(false);
    await new Promise((resolve) => setTimeout(resolve, 50));
    const restoredRoom = await client.reconnect<LifecycleWireState>(reconnectToken);
    rooms.push(restoredRoom);
    restoredRoom.onMessage('private:state', () => undefined);
    restoredRoom.onMessage('private:sonar', () => undefined);
    const restoredSession = await sessionFor(restoredRoom);
    expect(restoredSession.playerId).toBe(guestSession.playerId);
    expect(restoredRoom.state.players.get(restoredSession.playerId)?.connected).toBe(true);
    expect(restoredRoom.state.players.get(restoredSession.playerId)?.hearts).toBe(
      GAMEPLAY_CONFIG.startingHearts,
    );

    const replacementRoom = await client.joinById<LifecycleWireState>(restoredSession.roomId, {
      playerName: 'Guest',
      sessionToken: restoredSession.sessionToken,
    });
    rooms.push(replacementRoom);
    replacementRoom.onMessage('private:state', () => undefined);
    replacementRoom.onMessage('private:sonar', () => undefined);
    const replacementSession = await sessionFor(replacementRoom);
    expect(replacementSession.playerId).toBe(restoredSession.playerId);
    await waitFor(() => !restoredRoom.connection.isOpen);
    expect(replacementRoom.state.players.get(replacementSession.playerId)?.connected).toBe(true);
  }, 10_000);

  it('removes a player who deliberately leaves the lobby', async () => {
    const hostRoom = await client.create<LifecycleWireState>('invisi_fight', {
      playerName: 'LobbyHost',
    });
    rooms.push(hostRoom);
    const hostSession = await sessionFor(hostRoom);
    expect(hostSession.sonarReadyAtServerMs).toBe(0);
    await waitFor(() => Boolean(hostRoom.state.players.get(hostSession.playerId)));

    const guestRoom = await client.join<LifecycleWireState>('invisi_fight', {
      playerName: 'LobbyGuest',
      roomCode: hostRoom.state.roomCode,
    });
    rooms.push(guestRoom);
    const guestSession = await sessionFor(guestRoom);
    await waitFor(() => Boolean(hostRoom.state.players.get(guestSession.playerId)));

    await guestRoom.leave(true);
    await waitFor(() => !hostRoom.state.players.get(guestSession.playerId));
    expect(hostRoom.state.players.get(guestSession.playerId)).toBeUndefined();
  });

  it('ends an active match when a departed player leaves one fighter standing', async () => {
    const hostRoom = await client.create<LifecycleWireState>('invisi_fight', {
      playerName: 'WinningHost',
    });
    rooms.push(hostRoom);
    const hostSession = await sessionFor(hostRoom);

    const guestRoom = await client.join<LifecycleWireState>('invisi_fight', {
      playerName: 'DepartingGuest',
      roomCode: hostRoom.state.roomCode,
    });
    rooms.push(guestRoom);
    const guestSession = await sessionFor(guestRoom);
    hostRoom.send('input:start', { sessionToken: hostSession.sessionToken });
    await waitFor(() => hostRoom.state.phase === 'hunt');

    await guestRoom.leave(false);
    await waitFor(() => hostRoom.state.phase === 'results');
    expect(hostRoom.state.players.get(guestSession.playerId)).toBeUndefined();
  });

  it('applies a valid movement message to the authoritative private position', async () => {
    const hostRoom = await client.create<LifecycleWireState>('invisi_fight', {
      playerName: 'MovingHost',
    });
    rooms.push(hostRoom);
    const hostSession = await sessionFor(hostRoom);
    let privateState: PrivatePlayerStateEvent | null = null;
    hostRoom.onMessage<PrivatePlayerStateEvent>('private:state', (event) => {
      privateState = event;
    });

    const guestRoom = await client.join<LifecycleWireState>('invisi_fight', {
      playerName: 'StillGuest',
      roomCode: hostRoom.state.roomCode,
    });
    rooms.push(guestRoom);
    await sessionFor(guestRoom);
    guestRoom.onMessage('private:state', () => undefined);
    guestRoom.onMessage('private:sonar', () => undefined);
    hostRoom.send('input:start', { sessionToken: hostSession.sessionToken });
    await waitFor(() => hostRoom.state.phase === 'hunt');
    await waitFor(() => privateState !== null);
    const startingX = (privateState as PrivatePlayerStateEvent).position.x;

    hostRoom.send('input:player', {
      moveX: 1,
      moveY: 0,
      aimAngleRad: 0,
      sequence: 1,
      clientTimeMs: Date.now(),
    });
    await waitFor(
      () =>
        privateState !== null &&
        (privateState as PrivatePlayerStateEvent).sequence === 1 &&
        (privateState as PrivatePlayerStateEvent).position.x > startingX,
    );
  });

  it('accepts aim but rejects movement during Commit', async () => {
    let serverNow = Date.now();
    const nowSpy = vi.spyOn(Date, 'now').mockImplementation(() => serverNow);
    try {
      const hostRoom = await client.create<LifecycleWireState>('invisi_fight', {
        playerName: 'CommitHost',
      });
      rooms.push(hostRoom);
      const hostSession = await sessionFor(hostRoom);
      let privateState: PrivatePlayerStateEvent | null = null;
      hostRoom.onMessage<PrivatePlayerStateEvent>('private:state', (event) => {
        privateState = event;
      });

      const guestRoom = await client.join<LifecycleWireState>('invisi_fight', {
        playerName: 'CommitGuest',
        roomCode: hostRoom.state.roomCode,
      });
      rooms.push(guestRoom);
      await sessionFor(guestRoom);
      guestRoom.onMessage('private:state', () => undefined);

      hostRoom.send('input:start', { sessionToken: hostSession.sessionToken });
      await waitFor(() => hostRoom.state.phase === 'hunt');
      await waitFor(() => privateState !== null);

      serverNow += GAMEPLAY_CONFIG.huntDurationMs + 1;
      await waitFor(() => hostRoom.state.phase === 'commit');
      const commitPosition = { ...(privateState as PrivatePlayerStateEvent).position };
      const commitAim = 1.234;

      hostRoom.send('input:player', {
        moveX: 1,
        moveY: 1,
        aimAngleRad: commitAim,
        sequence: 91,
        clientTimeMs: serverNow,
      });

      await waitFor(
        () =>
          privateState !== null &&
          (privateState as PrivatePlayerStateEvent).sequence === 91 &&
          (privateState as PrivatePlayerStateEvent).aimAngleRad === commitAim,
      );
      expect((privateState as PrivatePlayerStateEvent).position).toEqual(commitPosition);
      expect((privateState as PrivatePlayerStateEvent).velocity).toEqual({ x: 0, y: 0 });
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('routes exact sonar detections privately and approximate emissions to opponents', async () => {
    const hostRoom = await client.create<LifecycleWireState>('invisi_fight', {
      playerName: 'ScannerHost',
    });
    rooms.push(hostRoom);
    const hostSession = await sessionFor(hostRoom);
    const hostStatuses: SonarStatusEvent[] = [];
    const hostSnapshots: PrivateSonarSnapshotEvent[] = [];
    hostRoom.onMessage<SonarStatusEvent>('private:sonar-status', (event) => {
      hostStatuses.push(event);
    });
    hostRoom.onMessage<PrivateSonarSnapshotEvent>('private:sonar', (event) => {
      hostSnapshots.push(event);
    });
    hostRoom.onMessage('private:state', () => undefined);

    const guestRoom = await client.join<LifecycleWireState>('invisi_fight', {
      playerName: 'PulseOpponent',
      roomCode: hostRoom.state.roomCode,
    });
    rooms.push(guestRoom);
    await sessionFor(guestRoom);
    const guestSnapshots: PrivateSonarSnapshotEvent[] = [];
    const guestEmissions: PublicSonarEmissionEvent[] = [];
    guestRoom.onMessage<PrivateSonarSnapshotEvent>('private:sonar', (event) => {
      guestSnapshots.push(event);
    });
    guestRoom.onMessage<PublicSonarEmissionEvent>('match:sonar-emission', (event) => {
      guestEmissions.push(event);
    });
    guestRoom.onMessage('private:state', () => undefined);

    hostRoom.send('input:start', { sessionToken: hostSession.sessionToken });
    await waitFor(() => hostRoom.state.phase === 'hunt');

    const spectatorRoom = await client.join<LifecycleWireState>('invisi_fight', {
      playerName: 'PulseSpectator',
      roomCode: hostRoom.state.roomCode,
    });
    rooms.push(spectatorRoom);
    const spectatorSession = await sessionFor(spectatorRoom);
    expect(spectatorRoom.state.players.get(spectatorSession.playerId)?.role).toBe('spectator');
    const spectatorSnapshots: PrivateSonarSnapshotEvent[] = [];
    const spectatorEmissions: PublicSonarEmissionEvent[] = [];
    spectatorRoom.onMessage<PrivateSonarSnapshotEvent>('private:sonar', (event) => {
      spectatorSnapshots.push(event);
    });
    spectatorRoom.onMessage<PublicSonarEmissionEvent>('match:sonar-emission', (event) => {
      spectatorEmissions.push(event);
    });

    hostRoom.send('input:sonar', {
      sessionToken: hostSession.sessionToken,
      sequence: 1,
      clientTimeMs: Date.now(),
    });

    await waitFor(
      () =>
        hostStatuses.some((status) => status.accepted && status.requestSequence === 1) &&
        hostSnapshots.length === 1 &&
        guestEmissions.length === 1,
    );
    const restoredSession = await sessionFor(hostRoom);
    expect(restoredSession.sonarReadyAtServerMs).toBeGreaterThan(restoredSession.serverTimeMs);
    expect(hostSnapshots[0]).toMatchObject({
      type: 'private_sonar_snapshot',
      detectedPlayerId: expect.any(String),
    });
    expect(guestSnapshots).toHaveLength(0);
    expect(guestEmissions[0]).toMatchObject({
      type: 'sonar_emission',
      emitterId: hostSession.playerId,
      radius: GAMEPLAY_CONFIG.sonarPulseRadiusPx,
    });
    expect(guestEmissions[0]).not.toHaveProperty('exactOrigin');
    expect(guestEmissions[0]).not.toHaveProperty('detectedPlayerIds');
    expect(guestEmissions[0]!.approximateOrigin.x % GAMEPLAY_CONFIG.sonarOriginQuantizationPx).toBe(
      0,
    );
    expect(guestEmissions[0]!.approximateOrigin.y % GAMEPLAY_CONFIG.sonarOriginQuantizationPx).toBe(
      0,
    );
    expect(spectatorSnapshots).toHaveLength(0);
    expect(spectatorEmissions).toHaveLength(0);

    hostRoom.send('input:sonar', {
      sessionToken: hostSession.sessionToken,
      sequence: 2,
      clientTimeMs: Date.now(),
    });
    await waitFor(() =>
      hostStatuses.some(
        (status) =>
          !status.accepted && status.requestSequence === 2 && status.reason === 'cooldown',
      ),
    );

    hostRoom.send('input:sonar', {
      sessionToken: 'not-a-valid-session-token',
      sequence: 3,
      clientTimeMs: Date.now(),
    });
    await waitFor(() =>
      hostStatuses.some(
        (status) =>
          !status.accepted && status.requestSequence === 3 && status.reason === 'invalid_request',
      ),
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(hostSnapshots).toHaveLength(1);
    expect(guestEmissions).toHaveLength(1);
    expect(spectatorSnapshots).toHaveLength(0);
    expect(spectatorEmissions).toHaveLength(0);
  });

  it('keeps explicit and automatic shot locks private until Resolution', async () => {
    let serverNow = Date.now();
    const nowSpy = vi.spyOn(Date, 'now').mockImplementation(() => serverNow);
    try {
      const hostRoom = await client.create<LifecycleWireState>('invisi_fight', {
        playerName: 'LockHost',
      });
      rooms.push(hostRoom);
      const hostSession = await sessionFor(hostRoom);
      const hostLockStatuses: ShotLockStatusEvent[] = [];
      hostRoom.onMessage<ShotLockStatusEvent>('private:shot-lock-status', (event) => {
        hostLockStatuses.push(event);
      });
      hostRoom.onMessage('private:state', () => undefined);
      hostRoom.onMessage('match:shot', () => undefined);

      const guestRoom = await client.join<LifecycleWireState>('invisi_fight', {
        playerName: 'AutoLockGuest',
        roomCode: hostRoom.state.roomCode,
      });
      rooms.push(guestRoom);
      const guestSession = await sessionFor(guestRoom);
      const guestLockStatuses: ShotLockStatusEvent[] = [];
      guestRoom.onMessage<ShotLockStatusEvent>('private:shot-lock-status', (event) => {
        guestLockStatuses.push(event);
      });
      guestRoom.onMessage('private:state', () => undefined);
      guestRoom.onMessage('match:shot', () => undefined);

      hostRoom.send('input:start', { sessionToken: hostSession.sessionToken });
      await waitFor(() => hostRoom.state.phase === 'hunt');
      hostRoom.send('input:lock-shot', {
        sessionToken: hostSession.sessionToken,
        aimAngleRad: 0.25,
        sequence: 1,
        clientTimeMs: serverNow,
      });
      await waitFor(() =>
        hostLockStatuses.some(
          (status) =>
            !status.accepted && status.requestSequence === 1 && status.reason === 'wrong_phase',
        ),
      );

      serverNow += GAMEPLAY_CONFIG.huntDurationMs + 1;
      await waitFor(() => hostRoom.state.phase === 'commit');
      hostRoom.send('input:lock-shot', {
        sessionToken: hostSession.sessionToken,
        aimAngleRad: 'invalid-angle',
        sequence: 2,
        clientTimeMs: serverNow,
      });
      await waitFor(() =>
        hostLockStatuses.some(
          (status) =>
            !status.accepted && status.requestSequence === 2 && status.reason === 'invalid_request',
        ),
      );

      const spectatorRoom = await client.join<LifecycleWireState>('invisi_fight', {
        playerName: 'LockSpectator',
        roomCode: hostRoom.state.roomCode,
      });
      rooms.push(spectatorRoom);
      const spectatorSession = await sessionFor(spectatorRoom);
      const spectatorStatuses: ShotLockStatusEvent[] = [];
      spectatorRoom.onMessage<ShotLockStatusEvent>('private:shot-lock-status', (event) => {
        spectatorStatuses.push(event);
      });
      spectatorRoom.onMessage('match:shot', () => undefined);
      spectatorRoom.send('input:lock-shot', {
        sessionToken: spectatorSession.sessionToken,
        aimAngleRad: 0.5,
        sequence: 1,
        clientTimeMs: serverNow,
      });
      await waitFor(() =>
        spectatorStatuses.some(
          (status) =>
            !status.accepted && status.requestSequence === 1 && status.reason === 'not_active',
        ),
      );

      hostRoom.send('input:lock-shot', {
        sessionToken: hostSession.sessionToken,
        aimAngleRad: 0.4,
        sequence: 3,
        clientTimeMs: serverNow,
      });
      hostRoom.send('input:lock-shot', {
        sessionToken: hostSession.sessionToken,
        aimAngleRad: 1.2,
        sequence: 4,
        clientTimeMs: serverNow,
      });
      hostRoom.send('input:lock-shot', {
        sessionToken: hostSession.sessionToken,
        aimAngleRad: 0.8,
        sequence: 3,
        clientTimeMs: serverNow,
      });
      await waitFor(
        () =>
          hostLockStatuses.some(
            (status) => status.accepted && status.requestSequence === 4 && status.replaced,
          ) &&
          hostLockStatuses.some(
            (status) =>
              !status.accepted &&
              status.requestSequence === 3 &&
              status.reason === 'stale_sequence',
          ),
      );

      guestRoom.send('input:player', {
        moveX: 0,
        moveY: 0,
        aimAngleRad: 2.2,
        sequence: 91,
        clientTimeMs: serverNow,
      });
      const restoredHostSession = await sessionFor(hostRoom);
      expect(restoredHostSession.shotLockStatus).toMatchObject({
        accepted: true,
        requestSequence: 4,
        lockedAimAngleRad: 1.2,
        lockSource: 'explicit',
      });
      expect(guestLockStatuses).toHaveLength(0);
      expect(guestRoom.state.players.get(hostSession.playerId)?.lockedAimAngleRad).toBe(0);
      expect(guestRoom.state.players.get(hostSession.playerId)?.revealedX).toBe(-1);
      expect(guestRoom.state.players.get(hostSession.playerId)?.revealedY).toBe(-1);

      serverNow += GAMEPLAY_CONFIG.commitDurationMs + 1;
      await waitFor(() => hostRoom.state.phase === 'resolution');
      await waitFor(() =>
        guestLockStatuses.some((status) => status.accepted && status.lockSource === 'automatic'),
      );
      expect(hostRoom.state.players.get(hostSession.playerId)?.lockedAimAngleRad).toBeCloseTo(1.2);
      expect(hostRoom.state.players.get(guestSession.playerId)?.lockedAimAngleRad).toBeCloseTo(2.2);
      expect(hostRoom.state.players.get(hostSession.playerId)?.revealedX).toBeGreaterThanOrEqual(0);
      expect(hostRoom.state.players.get(hostSession.playerId)?.revealedY).toBeGreaterThanOrEqual(0);
    } finally {
      nowSpy.mockRestore();
    }
  }, 12_000);

  it('plays a two-heart match and resets both fighters on replay', async () => {
    let serverNow = Date.now();
    const nowSpy = vi.spyOn(Date, 'now').mockImplementation(() => serverNow);
    try {
      const hostRoom = await client.create<LifecycleWireState>('invisi_fight', {
        playerName: 'TwoHeartHost',
      });
      rooms.push(hostRoom);
      const hostSession = await sessionFor(hostRoom);
      hostRoom.onMessage('private:state', () => undefined);
      hostRoom.onMessage('private:shot-lock-status', () => undefined);
      hostRoom.onMessage('match:shot', () => undefined);

      const guestRoom = await client.join<LifecycleWireState>('invisi_fight', {
        playerName: 'TwoHeartGuest',
        roomCode: hostRoom.state.roomCode,
      });
      rooms.push(guestRoom);
      const guestSession = await sessionFor(guestRoom);
      guestRoom.onMessage('private:state', () => undefined);
      guestRoom.onMessage('private:shot-lock-status', () => undefined);
      guestRoom.onMessage('match:shot', () => undefined);

      await waitFor(() => Boolean(hostRoom.state.players.get(guestSession.playerId)));
      expect(hostRoom.state.players.get(hostSession.playerId)?.hearts).toBe(
        GAMEPLAY_CONFIG.startingHearts,
      );
      expect(hostRoom.state.players.get(guestSession.playerId)?.hearts).toBe(
        GAMEPLAY_CONFIG.startingHearts,
      );

      hostRoom.send('input:start', { sessionToken: hostSession.sessionToken });
      await waitFor(() => hostRoom.state.phase === 'hunt');
      serverNow += GAMEPLAY_CONFIG.huntDurationMs + 1;
      await waitFor(() => hostRoom.state.phase === 'commit');
      serverNow += GAMEPLAY_CONFIG.commitDurationMs + 1;
      await waitFor(() => hostRoom.state.phase === 'resolution');
      const advanceFirstResolution = setInterval(() => {
        serverNow += 100;
      }, 100);
      try {
        await waitFor(() => hostRoom.state.phase === 'recap', 5_000);
      } finally {
        clearInterval(advanceFirstResolution);
      }

      expect(hostRoom.state.players.get(hostSession.playerId)?.hearts).toBe(1);
      expect(hostRoom.state.players.get(guestSession.playerId)?.hearts).toBe(1);
      const recapEntries = Array.from(hostRoom.state.recapEntries);
      expect(recapEntries).toHaveLength(2);
      expect(recapEntries.map((entry) => entry.orderIndex)).toEqual([0, 1]);
      expect(recapEntries.every((entry) => entry.outcome === 'hit')).toBe(true);
      expect(recapEntries.map((entry) => entry.targetHeartsRemaining)).toEqual([1, 1]);
      expect(hostRoom.state.nextFirstShooterId).not.toBe('');
      const nextFirstShooterId = hostRoom.state.nextFirstShooterId;

      serverNow += GAMEPLAY_CONFIG.recapDurationMs + 1;
      await waitFor(() => hostRoom.state.phase === 'hunt');
      expect(Array.from(hostRoom.state.firingOrder)[0]).toBe(nextFirstShooterId);
      expect(Array.from(hostRoom.state.recapEntries)).toHaveLength(0);
      serverNow += GAMEPLAY_CONFIG.huntDurationMs + 1;
      await waitFor(() => hostRoom.state.phase === 'commit');
      serverNow += GAMEPLAY_CONFIG.commitDurationMs + 1;
      await waitFor(() => hostRoom.state.phase === 'resolution');
      const advanceSecondResolution = setInterval(() => {
        serverNow += 100;
      }, 100);
      try {
        await waitFor(() => hostRoom.state.phase === 'results', 5_000);
      } finally {
        clearInterval(advanceSecondResolution);
      }

      const resultHearts = [
        hostRoom.state.players.get(hostSession.playerId)?.hearts,
        hostRoom.state.players.get(guestSession.playerId)?.hearts,
      ].sort();
      expect(resultHearts).toEqual([0, 1]);

      hostRoom.send('input:replay', { sessionToken: hostSession.sessionToken });
      await waitFor(() => hostRoom.state.phase === 'lobby');
      expect(hostRoom.state.players.get(hostSession.playerId)?.hearts).toBe(
        GAMEPLAY_CONFIG.startingHearts,
      );
      expect(hostRoom.state.players.get(guestSession.playerId)?.hearts).toBe(
        GAMEPLAY_CONFIG.startingHearts,
      );
      expect(Array.from(hostRoom.state.recapEntries)).toHaveLength(0);
      expect(hostRoom.state.nextFirstShooterId).toBe('');
    } finally {
      nowSpy.mockRestore();
    }
  }, 15_000);

  it('paces shooter anticipation and sequential resolution beats', async () => {
    let serverNow = Date.now();
    const nowSpy = vi.spyOn(Date, 'now').mockImplementation(() => serverNow);
    try {
      const hostRoom = await client.create<LifecycleWireState>('invisi_fight', {
        playerName: 'PacingHost',
      });
      rooms.push(hostRoom);
      const hostSession = await sessionFor(hostRoom);
      const shots: ShotResolutionEvent[] = [];
      hostRoom.onMessage('private:state', () => undefined);
      hostRoom.onMessage('private:shot-lock-status', () => undefined);
      hostRoom.onMessage<ShotResolutionEvent>('match:shot', (event) => shots.push(event));

      const guestRoom = await client.join<LifecycleWireState>('invisi_fight', {
        playerName: 'PacingGuest',
        roomCode: hostRoom.state.roomCode,
      });
      rooms.push(guestRoom);
      await sessionFor(guestRoom);
      guestRoom.onMessage('private:state', () => undefined);
      guestRoom.onMessage('private:shot-lock-status', () => undefined);
      guestRoom.onMessage('match:shot', () => undefined);

      hostRoom.send('input:start', { sessionToken: hostSession.sessionToken });
      await waitFor(() => hostRoom.state.phase === 'hunt');
      serverNow += GAMEPLAY_CONFIG.huntDurationMs + 1;
      await waitFor(() => hostRoom.state.phase === 'commit');
      serverNow += GAMEPLAY_CONFIG.commitDurationMs + 1;
      await waitFor(() => hostRoom.state.phase === 'resolution');
      const resolutionStartedAtServerMs = serverNow;
      expect(hostRoom.state.activeShooterId).not.toBe('');
      expect(shots).toHaveLength(0);

      const advanceResolution = setInterval(() => {
        serverNow += 50;
      }, 50);
      try {
        await waitFor(() => shots.length === 2, 5_000);
      } finally {
        clearInterval(advanceResolution);
      }
      expect(shots[0]!.resolvedAtServerMs - resolutionStartedAtServerMs).toBeGreaterThanOrEqual(
        GAMEPLAY_CONFIG.shotAnticipationMs,
      );
      expect(shots[1]!.resolvedAtServerMs - shots[0]!.resolvedAtServerMs).toBeGreaterThanOrEqual(
        GAMEPLAY_CONFIG.shotResolutionStepMs,
      );
    } finally {
      nowSpy.mockRestore();
    }
  }, 12_000);

  it('keeps a player restored by signed-session fallback after the transport grace expires', async () => {
    const hostRoom = await client.create<LifecycleWireState>('invisi_fight', {
      playerName: 'FallbackHost',
    });
    rooms.push(hostRoom);
    await sessionFor(hostRoom);

    const guestRoom = await client.join<LifecycleWireState>('invisi_fight', {
      playerName: 'FallbackGuest',
      roomCode: hostRoom.state.roomCode,
    });
    rooms.push(guestRoom);
    const guestSession = await sessionFor(guestRoom);
    await guestRoom.leave(false);

    const replacementRoom = await client.joinById<LifecycleWireState>(guestSession.roomId, {
      playerName: 'FallbackGuest',
      sessionToken: guestSession.sessionToken,
    });
    rooms.push(replacementRoom);
    const replacementSession = await sessionFor(replacementRoom);
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(replacementSession.playerId).toBe(guestSession.playerId);
    expect(replacementRoom.state.players.get(guestSession.playerId)?.connected).toBe(true);
  });

  it('advances Hunt through Commit, Resolution, Recap, and the next Hunt', async () => {
    let serverNow = Date.now();
    const nowSpy = vi.spyOn(Date, 'now').mockImplementation(() => serverNow);
    try {
      const hostRoom = await client.create<LifecycleWireState>('invisi_fight', {
        playerName: 'PhaseHost',
      });
      rooms.push(hostRoom);
      hostRoom.onMessage('private:state', () => undefined);
      hostRoom.onMessage('private:sonar', () => undefined);
      hostRoom.onMessage('match:shot', () => undefined);
      const hostSession = await sessionFor(hostRoom);

      const guestRoom = await client.join<LifecycleWireState>('invisi_fight', {
        playerName: 'PhaseGuest',
        roomCode: hostRoom.state.roomCode,
      });
      rooms.push(guestRoom);
      guestRoom.onMessage('private:state', () => undefined);
      guestRoom.onMessage('private:sonar', () => undefined);
      guestRoom.onMessage('match:shot', () => undefined);
      await sessionFor(guestRoom);

      hostRoom.send('input:start', { sessionToken: hostSession.sessionToken });
      await waitFor(() => hostRoom.state.phase === 'hunt');

      serverNow += 15_001;
      await waitFor(() => hostRoom.state.phase === 'commit');

      serverNow += 3_001;
      await waitFor(() => hostRoom.state.phase === 'resolution');
      const advanceResolutionClock = setInterval(() => {
        serverNow += 100;
      }, 100);
      try {
        await waitFor(() => hostRoom.state.phase === 'recap', 5_000);
      } finally {
        clearInterval(advanceResolutionClock);
      }

      serverNow += 1_501;
      await waitFor(() => hostRoom.state.phase === 'hunt');
    } finally {
      nowSpy.mockRestore();
    }
  }, 12_000);
});
