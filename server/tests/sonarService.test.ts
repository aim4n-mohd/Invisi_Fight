import { describe, expect, it } from 'vitest';
import { GAMEPLAY_CONFIG } from '@invisi-fight/shared';
import { SonarService, type SonarPlayer } from '../src/services/SonarService.js';

function player(
  playerId: string,
  x: number,
  y: number,
  overrides: Partial<SonarPlayer> = {},
): SonarPlayer {
  return {
    playerId,
    position: { x, y },
    alive: true,
    spectator: false,
    ...overrides,
  };
}

describe('SonarService', () => {
  it('uses the Echo policy without inheriting Classic snapshot or quantization tuning', () => {
    const service = new SonarService();
    const result = service.activate(
      [player('a', 101, 235), player('b', 920, 510)],
      'a',
      'echo_hunt',
      1_000,
      {
        allowedPhases: ['echo_hunt'],
        cooldownMs: 6_000,
        radiusPx: 1_100,
        snapshotDurationMs: 1_250,
        originQuantizationPx: 100,
      },
    );
    expect(result).toMatchObject({
      accepted: true,
      readyAtServerMs: 7_000,
      approximateOrigin: { x: 100, y: 200 },
      detections: [{ targetId: 'b', expiresAtServerMs: 2_250 }],
    });
  });
  it('should accept a Hunt pulse and return fixed snapshots inside the radial boundary', () => {
    const service = new SonarService();
    const detector = player('detector', 101, 235);
    const boundaryTarget = player(
      'boundary',
      detector.position.x + GAMEPLAY_CONFIG.sonarPulseRadiusPx,
      detector.position.y,
    );
    const outsideTarget = player(
      'outside',
      detector.position.x + GAMEPLAY_CONFIG.sonarPulseRadiusPx + 0.01,
      detector.position.y,
    );
    const hiddenSpectator = player('spectator', 110, 235, { spectator: true });
    const deadTarget = player('dead', 120, 235, { alive: false });

    const result = service.activate(
      [detector, boundaryTarget, outsideTarget, hiddenSpectator, deadTarget],
      detector.playerId,
      'hunt',
      1_000,
    );

    expect(result).toMatchObject({
      accepted: true,
      activatedAtServerMs: 1_000,
      readyAtServerMs: 4_000,
      approximateOrigin: { x: 96, y: 240 },
    });
    if (!result.accepted) throw new Error('expected accepted sonar activation');
    expect(result.detections).toHaveLength(1);
    expect(result.detections[0]).toMatchObject({
      detectorId: 'detector',
      targetId: 'boundary',
      position: boundaryTarget.position,
      detectedAtServerMs: 1_000,
      expiresAtServerMs: 3_000,
    });

    boundaryTarget.position.x = 0;
    expect(result.detections[0]?.position.x).toBe(
      detector.position.x + GAMEPLAY_CONFIG.sonarPulseRadiusPx,
    );
  });

  it('should reject cooldown requests until the exact authoritative boundary', () => {
    const service = new SonarService();
    const players = [player('detector', 100, 100), player('target', 120, 100)];

    expect(service.activate(players, 'detector', 'hunt', 1_000)).toMatchObject({
      accepted: true,
      readyAtServerMs: 4_000,
    });
    expect(service.activate(players, 'detector', 'hunt', 3_999)).toEqual({
      accepted: false,
      reason: 'cooldown',
      readyAtServerMs: 4_000,
    });
    expect(service.activate(players, 'detector', 'hunt', 4_000)).toMatchObject({
      accepted: true,
      readyAtServerMs: 7_000,
    });
  });

  it('should detect an opponent across the full playable arena', () => {
    const service = new SonarService();
    const detector = player('detector', GAMEPLAY_CONFIG.playerRadius, GAMEPLAY_CONFIG.playerRadius);
    const farTarget = player(
      'far-target',
      GAMEPLAY_CONFIG.arenaWidth - GAMEPLAY_CONFIG.playerRadius,
      GAMEPLAY_CONFIG.arenaHeight - GAMEPLAY_CONFIG.playerRadius,
    );

    const result = service.activate([detector, farTarget], detector.playerId, 'hunt', 1_000);

    expect(result.accepted).toBe(true);
    if (!result.accepted) throw new Error('expected accepted sonar activation');
    expect(result.detections.map((detection) => detection.targetId)).toContain('far-target');
  });

  it('should reject requests outside Hunt or from inactive players without starting cooldown', () => {
    const service = new SonarService();
    const active = player('active', 100, 100);

    expect(service.activate([active], active.playerId, 'commit', 1_000)).toEqual({
      accepted: false,
      reason: 'wrong_phase',
      readyAtServerMs: 1_000,
    });
    expect(
      service.activate([player('dead', 100, 100, { alive: false })], 'dead', 'hunt', 1_000),
    ).toEqual({ accepted: false, reason: 'not_active', readyAtServerMs: 1_000 });
    expect(
      service.activate(
        [player('spectator', 100, 100, { spectator: true })],
        'spectator',
        'hunt',
        1_000,
      ),
    ).toEqual({ accepted: false, reason: 'not_active', readyAtServerMs: 1_000 });
    expect(service.activate([active], 'missing', 'hunt', 1_000)).toEqual({
      accepted: false,
      reason: 'not_active',
      readyAtServerMs: 1_000,
    });

    expect(service.activate([active], active.playerId, 'hunt', 1_000)).toMatchObject({
      accepted: true,
      readyAtServerMs: 4_000,
    });
  });

  it('should clear cooldown state only when reset explicitly', () => {
    const service = new SonarService();
    const players = [player('detector', 100, 100)];
    service.activate(players, 'detector', 'hunt', 1_000);
    expect(service.readyAt('detector')).toBe(4_000);
    service.reset();
    expect(service.readyAt('detector')).toBe(0);
  });
});
