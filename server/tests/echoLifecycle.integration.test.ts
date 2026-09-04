import type { AddressInfo } from 'node:net';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { Client, type Room } from 'colyseus.js';
import type { Server } from '@colyseus/core';
import {
  ECHO_GAMEPLAY_CONFIG as ECHO,
  type EchoActionStatusEvent,
  type PrivatePlayerStateEvent,
  type PublicSoundCueEvent,
  type SessionReadyEvent,
  type ShotResolutionEvent,
} from '@invisi-fight/shared';
import { assembleServer } from '../src/app.js';
import { readEnvironment } from '../src/config/env.js';
import type { InvisiFightRoomState } from '../src/rooms/InvisiFightRoomState.js';

interface Peer {
  room: Room<InvisiFightRoomState>;
  session: SessionReadyEvent;
  positions: PrivatePlayerStateEvent[];
  statuses: EchoActionStatusEvent[];
  cues: PublicSoundCueEvent[];
  shots: ShotResolutionEvent[];
  privateTypes: string[];
  sonarEmissions: number;
}

async function until(predicate: () => boolean): Promise<void> {
  await vi.waitFor(() => expect(predicate(), predicate.toString()).toBe(true), {
    timeout: 3_000,
    interval: 15,
  });
}

describe('Echo authoritative room lifecycle', () => {
  let server: Server;
  let client: Client;
  let now: number;
  const peers: Peer[] = [];
  beforeAll(async () => {
    const assembled = assembleServer(
      readEnvironment({
        NODE_ENV: 'test',
        SERVER_HOST: '127.0.0.1',
        ENABLE_DEV_MODE: 'false',
        MATCH_RECONNECT_GRACE_MS: '1000',
      }),
    );
    server = assembled.gameServer;
    await server.listen(0, '127.0.0.1');
    client = new Client(`ws://127.0.0.1:${(assembled.httpServer.address() as AddressInfo).port}`);
  });
  beforeEach(() => {
    now = Date.now();
    vi.spyOn(Date, 'now').mockImplementation(() => now);
  });
  afterEach(async () => {
    await Promise.allSettled(
      peers.map((peer) => peer.room.connection.isOpen && peer.room.leave(true)),
    );
    peers.length = 0;
    vi.restoreAllMocks();
  });
  afterAll(async () => server.gracefullyShutdown(false));

  async function attach(room: Room<InvisiFightRoomState>): Promise<Peer> {
    const peer: Peer = {
      room,
      session: null as unknown as SessionReadyEvent,
      positions: [],
      statuses: [],
      cues: [],
      shots: [],
      privateTypes: [],
      sonarEmissions: 0,
    };
    room.onMessage('*', (type, event) => {
      if (String(type).startsWith('private:')) peer.privateTypes.push(String(type));
      if (type === 'match:sonar-emission') peer.sonarEmissions += 1;
      if (type === 'session:ready') peer.session = event;
      if (type === 'private:state') peer.positions.push(event);
      if (type === 'private:echo-action-status') peer.statuses.push(event);
      if (type === 'match:sound-cue') peer.cues.push(event);
      if (type === 'match:shot') peer.shots.push(event);
    });
    room.send('session:request');
    peers.push(peer);
    await until(() => Boolean(peer.session && room.state.players?.get(peer.session.playerId)));
    return peer;
  }
  async function create(name = 'Host'): Promise<Peer> {
    return attach(await client.create('invisi_fight', { playerName: name, mode: 'echo_hunt' }));
  }
  async function join(host: Peer, name = 'Guest'): Promise<Peer> {
    return attach(
      await client.join('invisi_fight', {
        playerName: name,
        mode: 'echo_hunt',
        roomCode: host.session.roomCode,
      }),
    );
  }
  function action(peer: Peer, name: string, sequence: number, extra = {}): void {
    peer.room.send(`input:${name}`, {
      sessionToken: peer.session.sessionToken,
      sequence,
      clientTimeMs: now,
      ...extra,
    });
  }

  it('keeps practice harmless, resets dirty practice state, and caps initial seats', async () => {
    const host = await create();
    await until(() => host.positions.length > 0);
    expect(host.room.state.phase).toBe('lobby');
    action(host, 'decoy', 1, { aimAngleRad: 0 });
    action(host, 'fire', 1, { aimAngleRad: 0 });
    action(host, 'sonar', 1);
    await until(() => host.statuses.length >= 3);
    expect(host.statuses.find((status) => status.action === 'decoy')?.decoyAvailable).toBe(true);
    const guest = await join(host);
    await until(() => host.room.state.phase === 'countdown');
    const ends = host.room.state.phaseEndsAtServerMs;
    expect(ends - host.room.state.phaseStartedAtServerMs).toBe(5_000);
    await join(host, 'Third');
    await join(host, 'Fourth');
    const fifth = await join(host, 'Fifth');
    expect(fifth.room.state.players.get(fifth.session.playerId)?.inCurrentRoster).toBe(false);
    expect(host.room.state.phaseEndsAtServerMs).toBe(ends);
    now = ends + 1;
    await until(() => host.room.state.phase === 'echo_hunt');
    const fighters = Array.from(host.room.state.players.values()).filter(
      (player) => player.inCurrentRoster,
    );
    expect(fighters).toHaveLength(4);
    expect(fighters.every((player) => player.hearts === 3 && player.alive)).toBe(true);
    expect(fifth.positions).toHaveLength(0);
    await until(() => host.positions.at(-1)?.velocity.x === 0 && guest.positions.length > 0);
    expect(host.statuses.at(-1)).toMatchObject({
      fireReadyAtServerMs: 0,
      sonarReadyAtServerMs: 0,
      decoyAvailable: true,
      ammo: 3,
      reloadEndsAtServerMs: 0,
    });
    for (const player of fighters) {
      expect(player.revealedX).toBe(-1);
      expect(player.revealedY).toBe(-1);
      expect(player.lockedAimAngleRad).toBe(0);
      expect(player.resultStats.shots).toBe(0);
    }
  });

  it('keeps full-arena sonar private while every peer hears its public cue and spectators cannot act', async () => {
    const host = await create();
    const guest = await join(host);
    await until(() => host.room.state.phase === 'countdown');
    now += ECHO.countdownDurationMs + 1;
    await until(() => host.room.state.phase === 'echo_hunt');
    const watcher = await join(host, 'Watcher');
    action(host, 'sonar', 1);
    await until(() => [host, guest, watcher].every((peer) => peer.sonarEmissions === 1));
    expect(host.privateTypes).toContain('private:sonar');
    expect(guest.privateTypes).not.toContain('private:sonar');
    expect(watcher.privateTypes).toHaveLength(0);
    const readyAt = host.statuses.at(-1)!.sonarReadyAtServerMs;
    expect(readyAt).toBe(now + ECHO.sonarCooldownMs);
    action(watcher, 'sonar', 1);
    action(watcher, 'fire', 1, { aimAngleRad: 0 });
    action(watcher, 'decoy', 1, { aimAngleRad: 0 });
    // An ordered session request is a barrier after all three rejected actions.
    watcher.session = null as unknown as SessionReadyEvent;
    watcher.room.send('session:request');
    await until(() => Boolean(watcher.session));
    expect(watcher.privateTypes).toHaveLength(0);
    expect(watcher.session.fireReadyAtServerMs).toBeUndefined();
    expect(watcher.session.ammo).toBeUndefined();
    expect(watcher.session.reloadEndsAtServerMs).toBeUndefined();
    expect(watcher.shots).toHaveLength(0);
    action(host, 'sonar', 2);
    await until(() =>
      host.statuses.some(
        (status) => status.action === 'sonar' && !status.accepted && status.reason === 'cooldown',
      ),
    );
    expect(host.statuses.at(-1)!.sonarReadyAtServerMs).toBe(readyAt);
  });

  it('cancels countdown on a transport loss and starts a fresh countdown after reconnect', async () => {
    const host = await create();
    const guest = await join(host);
    await until(() => host.room.state.phase === 'countdown');
    const token = guest.room.reconnectionToken;
    await guest.room.leave(false);
    await until(() => host.room.state.phase === 'lobby');
    expect(host.room.state.players.has(guest.session.playerId)).toBe(true);
    now += 100;
    const restored = await attach(await client.reconnect(token));
    await until(() => host.room.state.phase === 'countdown');
    expect(restored.session.playerId).toBe(guest.session.playerId);
    expect(host.room.state.phaseEndsAtServerMs).toBe(now + ECHO.countdownDurationMs);
  });

  it('resolves three hits, rejects cooldowns, restores used decoy, and rematches only opted-in seats', async () => {
    const host = await create();
    const guest = await join(host);
    await until(() => host.room.state.phase === 'countdown');
    now += ECHO.countdownDurationMs + 1;
    await until(() => host.room.state.phase === 'echo_hunt');
    const spectator = await join(host, 'Watcher');
    action(host, 'decoy', 1, { aimAngleRad: 0 });
    await until(() => host.statuses.some((status) => status.action === 'decoy' && status.accepted));
    const restored = await attach(
      await client.joinById(host.room.roomId, {
        playerName: 'Host',
        mode: 'echo_hunt',
        sessionToken: host.session.sessionToken,
      }),
    );
    expect(restored.session.decoyAvailable).toBe(false);
    action(restored, 'fire', 1, { aimAngleRad: Math.PI / 2 });
    await until(() => guest.room.state.players.get(guest.session.playerId)?.hearts === 2);
    action(restored, 'fire', 2, { aimAngleRad: Math.PI / 2 });
    await until(() =>
      restored.statuses.some((status) => !status.accepted && status.reason === 'cooldown'),
    );
    for (let sequence = 3; sequence <= 4; sequence++) {
      now += ECHO.fireCooldownMs + 1;
      action(restored, 'fire', sequence, { aimAngleRad: Math.PI / 2 });
      await until(() => restored.shots.length === sequence - 1);
    }
    now += ECHO.resultsImpactHoldMs + 1;
    await until(() => guest.room.state.phase === 'results');
    expect(guest.room.state.players.get(guest.session.playerId)).toMatchObject({
      alive: false,
      inCurrentRoster: true,
      role: 'player',
    });
    expect(restored.room.state.players.get(restored.session.playerId)?.resultStats.shots).toBe(3);
    expect(restored.room.state.players.get(restored.session.playerId)?.rivalryWins).toBe(1);
    const late = await join(restored, 'ResultsWatcher');
    expect(late.room.state.phase).toBe('results');
    action(spectator, 'next-match', 1, { ready: true });
    await until(
      () =>
        spectator.room.state.players.get(spectator.session.playerId)?.readyForNextMatch === true,
    );
    const restoredSpectator = await attach(
      await client.joinById(spectator.room.roomId, {
        playerName: 'Watcher',
        mode: 'echo_hunt',
        sessionToken: spectator.session.sessionToken,
      }),
    );
    expect(restoredSpectator.session.nextMatchSequence).toBe(1);
    expect(restoredSpectator.session.fireReadyAtServerMs).toBeUndefined();
    expect(restoredSpectator.session.actionSequences).toBeUndefined();
    action(guest, 'next-match', 1, { ready: true });
    await until(() => guest.room.state.phase === 'countdown');
    now += ECHO.countdownDurationMs + 1;
    await until(() => guest.room.state.phase === 'echo_hunt');
    expect(guest.room.state.players.get(restored.session.playerId)?.inCurrentRoster).toBe(false);
    expect(guest.room.state.players.get(spectator.session.playerId)?.inCurrentRoster).toBe(true);
    expect(guest.room.state.players.get(restored.session.playerId)?.rivalryWins).toBe(1);
    expect(guest.room.state.players.get(guest.session.playerId)?.hearts).toBe(3);
  }, 15_000);

  it('enters Final Echo once, publishes anonymous cues to spectators, and rejects wrong-mode joins', async () => {
    const host = await create();
    await join(host);
    await expect(
      client.join('invisi_fight', {
        playerName: 'Wrong',
        roomCode: host.session.roomCode,
        mode: 'classic',
      }),
    ).rejects.toThrow();
    await until(() => host.room.state.phase === 'countdown');
    now += ECHO.countdownDurationMs + 1;
    await until(() => host.room.state.phase === 'echo_hunt');
    const spectator = await join(host, 'FinalWatcher');
    now += ECHO.huntDurationMs + 1;
    await until(() => host.room.state.phase === 'final_echo');
    await until(() => spectator.cues.length >= 2);
    expect(spectator.cues.every((cue) => cue.profile === 'final_echo')).toBe(true);
    expect(spectator.positions).toHaveLength(0);
    spectator.cues.forEach((cue) =>
      expect(Object.keys(cue).sort()).toEqual([
        'approximatePosition',
        'cueId',
        'emittedAtServerMs',
        'expiresAtServerMs',
        'intensity',
        'profile',
        'type',
      ]),
    );
    now += ECHO.finalEchoIntervalMs;
    await until(() => spectator.cues.length >= 4);
    expect(host.room.state.phase).toBe('final_echo');
  });

  it('freezes a disconnected active fighter and honors its reconnect grace before awarding a win', async () => {
    const host = await create();
    const guest = await join(host);
    await until(() => host.room.state.phase === 'countdown');
    now += ECHO.countdownDurationMs + 1;
    await until(() => host.room.state.phase === 'echo_hunt');
    const token = guest.room.reconnectionToken;
    await guest.room.leave(false);
    await until(() => host.room.state.players.get(guest.session.playerId)?.connected === false);
    expect(host.room.state.phase).toBe('echo_hunt');
    const restored = await attach(await client.reconnect(token));
    await until(() => restored.positions.length > 0);
    expect(restored.positions.at(-1)?.velocity).toEqual({ x: 0, y: 0 });
    expect(restored.session.playerId).toBe(guest.session.playerId);
    expect(host.room.state.phase).toBe('echo_hunt');
  });

  it('keeps a four-seat next-match queue in request order and cancels when fewer than two are connected', async () => {
    const host = await create();
    const guest = await join(host);
    await until(() => host.room.state.phase === 'countdown');
    now += ECHO.countdownDurationMs + 1;
    await until(() => host.room.state.phase === 'echo_hunt');
    const watchers = [];
    for (let i = 0; i < 4; i++) watchers.push(await join(host, `Queue${i}`));
    await guest.room.leave(true);
    await until(() => host.room.state.phase === 'results');
    for (const watcher of watchers) action(watcher, 'next-match', 1, { ready: true });
    await until(() => host.room.state.phase === 'countdown');
    action(host, 'next-match', 1, { ready: true });
    await until(() =>
      watchers.every(
        (watcher) => host.room.state.players.get(watcher.session.playerId)?.readyForNextMatch,
      ),
    );
    expect(host.room.state.players.get(host.session.playerId)?.readyForNextMatch).toBe(false);
    for (const watcher of watchers.slice(1)) action(watcher, 'next-match', 2, { ready: false });
    await until(() => host.room.state.phase === 'results');
    action(host, 'next-match', 2, { ready: true });
    await until(() => host.room.state.phase === 'countdown');
    now += ECHO.countdownDurationMs + 1;
    await until(() => host.room.state.phase === 'echo_hunt');
    expect(
      Array.from(host.room.state.players.values())
        .filter((p) => p.inCurrentRoster)
        .map((p) => p.playerId)
        .sort(),
    ).toEqual([host.session.playerId, watchers[0]!.session.playerId].sort());
  });

  it('caps Classic lobby and replay at four without changing its host-driven start', async () => {
    const host = await attach(
      await client.create('invisi_fight', { playerName: 'ClassicHost', mode: 'classic' }),
    );
    const others = [];
    for (let i = 0; i < 7; i++)
      others.push(
        await attach(
          await client.join('invisi_fight', {
            playerName: `Classic${i}`,
            mode: 'classic',
            roomCode: host.session.roomCode,
          }),
        ),
      );
    await until(() => host.room.state.players.size === 8);
    expect(host.room.state.phase).toBe('lobby');
    expect(
      Array.from(host.room.state.players.values()).filter((p) => p.inCurrentRoster),
    ).toHaveLength(4);
    host.room.send('input:start', { sessionToken: host.session.sessionToken });
    await until(() => host.room.state.phase === 'hunt');
    for (const fighter of others.slice(0, 3)) await fighter.room.leave(true);
    await until(() => host.room.state.phase === 'results');
    host.room.send('input:replay', { sessionToken: host.session.sessionToken });
    await until(() => host.room.state.phase === 'lobby');
    expect(
      Array.from(host.room.state.players.values()).filter((p) => p.inCurrentRoster),
    ).toHaveLength(4);
    expect(
      Array.from(host.room.state.players.values())
        .filter((p) => p.inCurrentRoster)
        .every((p) => p.hearts === 2),
    ).toBe(true);
  });

  it.each([3, 4])(
    'resolves a %s-player FFA to one winner without exposing ongoing positions',
    async (count) => {
      const host = await create();
      const opponents: Peer[] = [];
      for (let i = 1; i < count; i++) opponents.push(await join(host, `Fighter${i}`));
      await until(() => host.room.state.phase === 'countdown');
      now += ECHO.countdownDurationMs + 1;
      await until(() => host.room.state.phase === 'echo_hunt');
      await until(() =>
        [host, ...opponents].every((peer) => peer.positions.at(-1)?.serverTimeMs === now),
      );
      let sequence = 0;
      for (const target of opponents) {
        if (sequence > 0) now += ECHO.reloadStartDelayMs + ECHO.reloadDurationMs;
        const from = host.positions.at(-1)!.position;
        const to = target.positions.at(-1)!.position;
        for (let hit = 0; hit < 3; hit++) {
          now += ECHO.fireCooldownMs + 1;
          action(host, 'fire', ++sequence, {
            aimAngleRad: Math.atan2(to.y - from.y, to.x - from.x),
          });
          await until(() => host.shots.length === sequence);
          expect(host.shots.at(-1)?.targetId).toBe(target.session.playerId);
        }
      }
      now += ECHO.resultsImpactHoldMs + 1;
      await until(() => host.room.state.phase === 'results');
      expect(host.room.state.winnerPlayerId).toBe(host.session.playerId);
      expect(host.room.state.players.get(host.session.playerId)?.resultStats.hits).toBe(
        (count - 1) * 3,
      );
      for (const player of host.room.state.players.values()) {
        expect(player.revealedX).toBe(-1);
        expect(player.revealedY).toBe(-1);
        expect(player.lockedAimAngleRad).toBe(0);
      }
    },
  );
  it('broadcasts two anonymous reload clicks, restores pending reload and cancels it on match reset', async () => {
    const host = await create();
    const guest = await join(host);
    await until(() => host.room.state.phase === 'countdown');
    now += ECHO.countdownDurationMs + 1;
    await until(() => host.room.state.phase === 'echo_hunt');
    const watcher = await join(host, 'Watcher');
    expect(watcher.session.ammo).toBeUndefined();
    for (let sequence = 1; sequence <= 3; sequence++) {
      now += ECHO.fireCooldownMs + 1;
      action(host, 'fire', sequence, { aimAngleRad: 0 });
      await until(() => host.statuses.at(-1)?.ammo === 3 - sequence);
    }
    const empty = now;
    const start = empty + ECHO.reloadStartDelayMs;
    const ends = start + ECHO.reloadDurationMs;
    const reloads = (peer: Peer) => peer.cues.filter((cue) => cue.profile === 'reload');
    expect(host.statuses.at(-1)).toMatchObject({ ammo: 0, reloadEndsAtServerMs: ends });
    now = start - 1;
    await until(() => host.positions.at(-1)?.serverTimeMs === now);
    expect(reloads(host)).toHaveLength(0);
    now = start;
    await until(() => [host, guest, watcher].every((peer) => reloads(peer).length === 1));
    expect(reloads(guest)[0]).toEqual(reloads(host)[0]);
    expect(reloads(watcher)[0]).toEqual(reloads(host)[0]);
    expect(reloads(host)[0]).toMatchObject({
      intensity: ECHO.walkIntensity,
      emittedAtServerMs: start,
    });
    expect(reloads(host)[0]).not.toHaveProperty('playerId');
    expect(reloads(host)[0]).not.toHaveProperty('trueOrigin');

    const restored = await attach(
      await client.joinById(host.room.roomId, {
        playerName: 'Host',
        mode: 'echo_hunt',
        sessionToken: host.session.sessionToken,
      }),
    );
    expect(restored.session).toMatchObject({ ammo: 0, reloadEndsAtServerMs: ends });
    now = empty + ECHO.fireCooldownMs + 1;
    action(restored, 'fire', 4, { aimAngleRad: 0 });
    await until(() => restored.statuses.some((s) => !s.accepted && s.reason === 'reloading'));
    expect(restored.shots).toHaveLength(0);
    now = ends;
    await until(() => restored.statuses.at(-1)?.ammo === 3 && reloads(watcher).length === 2);
    expect(reloads(restored)).toHaveLength(1);
    expect(reloads(watcher)[1]).toEqual(reloads(restored)[0]);
    expect(watcher.statuses).toHaveLength(0);
    now += 1;
    await until(() => restored.positions.at(-1)?.serverTimeMs === now);
    expect(reloads(watcher)).toHaveLength(2);

    // Dirty a practice magazine, then cross the countdown boundary before ticking it.
    const practice = await create('PracticeReset');
    for (let sequence = 1; sequence <= 3; sequence++) {
      now += ECHO.fireCooldownMs + 1;
      action(practice, 'fire', sequence, { aimAngleRad: 0 });
      await until(() => practice.statuses.at(-1)?.ammo === 3 - sequence);
    }
    await join(practice, 'ResetGuest');
    await until(() => practice.room.state.phase === 'countdown');
    now += ECHO.countdownDurationMs + 1;
    await until(() => practice.room.state.phase === 'echo_hunt');
    expect(practice.statuses.at(-1)).toMatchObject({ ammo: 3, reloadEndsAtServerMs: 0 });
    expect(reloads(practice)).toHaveLength(0);
  });
});
