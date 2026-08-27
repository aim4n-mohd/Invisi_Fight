import { describe, expect, it } from 'vitest';
import {
  displayNameSchema,
  lockShotSchema,
  playerInputSchema,
  privateSonarSnapshotEventSchema,
  publicSonarEmissionEventSchema,
  roomCodeSchema,
  sonarStatusEventSchema,
  shotLockStatusEventSchema,
  triggerSonarSchema,
} from '../src/index.js';

describe('network boundary contracts', () => {
  it('should normalize valid names and room codes', () => {
    expect(displayNameSchema.parse('  Aiman  ')).toBe('Aiman');
    expect(roomCodeSchema.parse('ab23cd')).toBe('AB23CD');
  });

  it('should reject names and room codes outside the anonymous-room policy', () => {
    expect(() => displayNameSchema.parse('')).toThrow();
    expect(() => displayNameSchema.parse('<script>')).toThrow();
    expect(() => roomCodeSchema.parse('ABC')).toThrow();
    expect(() => roomCodeSchema.parse('AB10CD')).toThrow();
  });

  it('should reject malformed movement and aim input', () => {
    expect(() =>
      playerInputSchema.parse({
        moveX: 2,
        moveY: 0,
        aimAngleRad: 0,
        sequence: 0,
        clientTimeMs: 100,
      }),
    ).toThrow();
  });

  it('normalizes MessagePack bigint timestamps from Colyseus input messages', () => {
    const parsed = playerInputSchema.parse({
      moveX: 1,
      moveY: 0,
      aimAngleRad: 0,
      sequence: 1,
      clientTimeMs: 1_787_334_908_575n,
    });
    expect(parsed.clientTimeMs).toBe(1_787_334_908_575);
  });

  it('validates strict manual-sonar request and event boundaries', () => {
    const sessionToken = 's'.repeat(32);
    expect(
      triggerSonarSchema.parse({
        sessionToken,
        sequence: 3,
        clientTimeMs: 2_000n,
      }),
    ).toEqual({ sessionToken, sequence: 3, clientTimeMs: 2_000 });

    expect(
      privateSonarSnapshotEventSchema.parse({
        type: 'private_sonar_snapshot',
        snapshotId: 'snapshot-1',
        detectedPlayerId: 'player-2',
        position: { x: 120, y: 240 },
        detectedAtServerMs: 2_100,
        expiresAtServerMs: 4_100,
      }),
    ).toMatchObject({ type: 'private_sonar_snapshot', detectedPlayerId: 'player-2' });

    expect(
      sonarStatusEventSchema.parse({
        type: 'sonar_status',
        accepted: true,
        requestSequence: 3,
        activatedAtServerMs: 2_100,
        readyAtServerMs: 5_100,
      }),
    ).toMatchObject({ accepted: true, readyAtServerMs: 5_100 });

    expect(
      publicSonarEmissionEventSchema.parse({
        type: 'sonar_emission',
        emissionId: 'emission-1',
        emitterId: 'player-1',
        approximateOrigin: { x: 96, y: 240 },
        radius: 320,
        emittedAtServerMs: 2_100,
        expiresAtServerMs: 2_600,
      }),
    ).toMatchObject({ approximateOrigin: { x: 96, y: 240 }, radius: 320 });
  });

  it('rejects sonar payloads that could leak undeclared exact or detection data', () => {
    expect(() =>
      publicSonarEmissionEventSchema.parse({
        type: 'sonar_emission',
        emissionId: 'emission-1',
        emitterId: 'player-1',
        approximateOrigin: { x: 96, y: 240 },
        exactOrigin: { x: 101, y: 235 },
        detectedPlayerIds: ['player-2'],
        radius: 320,
        emittedAtServerMs: 2_100,
        expiresAtServerMs: 2_600,
      }),
    ).toThrow();

    expect(() =>
      triggerSonarSchema.parse({
        sessionToken: 'short',
        sequence: -1,
        clientTimeMs: -1,
      }),
    ).toThrow();
  });

  it('validates strict private shot-lock requests and acknowledgements', () => {
    const sessionToken = 's'.repeat(32);
    expect(
      lockShotSchema.parse({
        sessionToken,
        aimAngleRad: Math.PI / 2,
        sequence: 4,
        clientTimeMs: 5_000n,
      }),
    ).toEqual({
      sessionToken,
      aimAngleRad: Math.PI / 2,
      sequence: 4,
      clientTimeMs: 5_000,
    });
    expect(
      shotLockStatusEventSchema.parse({
        type: 'shot_lock_status',
        accepted: true,
        requestSequence: 4,
        lockedAimAngleRad: Math.PI / 2,
        lockSource: 'explicit',
        replaced: true,
        serverTimeMs: 5_100,
      }),
    ).toMatchObject({ accepted: true, lockSource: 'explicit', replaced: true });
  });

  it('rejects malformed shot-lock values and undeclared acknowledgement fields', () => {
    expect(() =>
      lockShotSchema.parse({
        sessionToken: 's'.repeat(32),
        aimAngleRad: Number.POSITIVE_INFINITY,
        sequence: 1,
        clientTimeMs: 1_000,
      }),
    ).toThrow();
    expect(() =>
      shotLockStatusEventSchema.parse({
        type: 'shot_lock_status',
        accepted: false,
        requestSequence: 1,
        reason: 'wrong_phase',
        serverTimeMs: 1_000,
        opponentAimAngleRad: 2,
      }),
    ).toThrow();
  });
});
