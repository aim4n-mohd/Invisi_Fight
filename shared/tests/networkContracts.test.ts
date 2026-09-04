import { describe, expect, it } from 'vitest';
import {
  displayNameSchema,
  decoyInputSchema,
  echoActionStatusEventSchema,
  fireInputSchema,
  lockShotSchema,
  playerInputSchema,
  privateSonarSnapshotEventSchema,
  publicSonarEmissionEventSchema,
  publicSoundCueEventSchema,
  roomCodeSchema,
  sonarStatusEventSchema,
  shotLockStatusEventSchema,
  triggerSonarSchema,
  nextMatchInputSchema,
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
    expect(parsed.running).toBe(false);
  });

  it('validates Echo action messages and anonymous sound cues strictly', () => {
    const sessionToken = 's'.repeat(32);
    expect(
      fireInputSchema.parse({ sessionToken, aimAngleRad: 1, sequence: 2, clientTimeMs: 10 }),
    ).toMatchObject({ aimAngleRad: 1, sequence: 2 });
    expect(
      decoyInputSchema.parse({ sessionToken, aimAngleRad: 0, sequence: 3, clientTimeMs: 11 }),
    ).toMatchObject({ aimAngleRad: 0, sequence: 3 });
    expect(
      nextMatchInputSchema.parse({ sessionToken, ready: true, sequence: 4, clientTimeMs: 12 }),
    ).toMatchObject({ ready: true, sequence: 4 });
    const cue = publicSoundCueEventSchema.parse({
      type: 'sound_cue',
      cueId: 'cue-1',
      profile: 'walk',
      approximatePosition: { x: 10, y: 20 },
      intensity: 0.25,
      emittedAtServerMs: 100,
      expiresAtServerMs: 900,
    });
    expect(Object.keys(cue).sort()).toEqual([
      'approximatePosition',
      'cueId',
      'emittedAtServerMs',
      'expiresAtServerMs',
      'intensity',
      'profile',
      'type',
    ]);
    expect(publicSoundCueEventSchema.parse({ ...cue, profile: 'reload' }).profile).toBe('reload');
    expect(() =>
      publicSoundCueEventSchema.parse({ ...cue, profile: 'reload', playerId: 'p' }),
    ).toThrow();
    expect(cue).not.toHaveProperty('playerId');
    expect(cue).not.toHaveProperty('decoy');
    expect(() => publicSoundCueEventSchema.parse({ ...cue, trueOrigin: { x: 1, y: 2 } })).toThrow();
    expect(
      echoActionStatusEventSchema.parse({
        type: 'echo_action_status',
        action: 'decoy',
        accepted: false,
        reason: 'unavailable_decoy',
        requestSequence: 8,
        fireReadyAtServerMs: 0,
        ammo: 3,
        reloadEndsAtServerMs: 0,
        sonarReadyAtServerMs: 0,
        decoyAvailable: false,
        serverTimeMs: 100,
      }),
    ).toMatchObject({ action: 'decoy', accepted: false });
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
  it('rejects client-supplied ammo and reload deadlines', () => {
    const request = {
      sessionToken: 's'.repeat(32),
      sequence: 1,
      clientTimeMs: 100,
      aimAngleRad: 0,
    };
    expect(fireInputSchema.parse(request)).toEqual(request);
    expect(() => fireInputSchema.parse({ ...request, ammo: 3 })).toThrow();
    expect(() => fireInputSchema.parse({ ...request, reloadEndsAtServerMs: 0 })).toThrow();
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
