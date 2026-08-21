import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client as ColyseusClient, type Room } from 'colyseus.js';
import type { Server } from '@colyseus/core';
import type { Server as HttpServer } from 'node:http';
import type { SessionReadyEvent } from '@invisi-fight/shared';
import { assembleServer } from '../src/app.js';
import { readEnvironment } from '../src/config/env.js';

interface LifecycleWireState {
  phase: string;
  roomCode: string;
  players: {
    get: (playerId: string) => { role: string; connected: boolean } | undefined;
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
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() >= deadline) throw new Error('state transition timed out');
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
      readEnvironment({ NODE_ENV: 'test', SERVER_HOST: '127.0.0.1', ENABLE_DEV_MODE: 'false' }),
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
    await waitFor(() => hostRoom.state.phase === 'planning');
    expect(guestRoom.state.phase).toBe('planning');

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
  }, 10_000);
});
