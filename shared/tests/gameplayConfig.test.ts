import { describe, expect, it } from 'vitest';
import {
  CLASSIC_GAMEPLAY_CONFIG,
  COMMON_GAMEPLAY_CONFIG,
  ECHO_GAMEPLAY_CONFIG,
  GAMEPLAY_CONFIG,
  NETWORK_TICK_MS,
} from '../src/index.js';

describe('gameplay configuration', () => {
  it('should keep the v2 round, sonar, health, and movement values centralized', () => {
    expect(GAMEPLAY_CONFIG.protocolVersion).toBe(5);
    expect(GAMEPLAY_CONFIG.huntDurationMs).toBe(15_000);
    expect(GAMEPLAY_CONFIG.commitDurationMs).toBe(3_000);
    expect(GAMEPLAY_CONFIG.recapDurationMs).toBe(1_500);
    expect(GAMEPLAY_CONFIG.sonarCooldownMs).toBe(3_000);
    expect(GAMEPLAY_CONFIG.sonarPulseRadiusPx).toBe(1_100);
    expect(GAMEPLAY_CONFIG.sonarPulseVisualDurationMs).toBe(500);
    expect(GAMEPLAY_CONFIG.sonarSnapshotDurationMs).toBe(2_000);
    expect(GAMEPLAY_CONFIG.sonarOriginQuantizationPx).toBe(48);
    expect(GAMEPLAY_CONFIG.playerSpeedPxPerSecond).toBe(165);
    expect(GAMEPLAY_CONFIG.startingHearts).toBe(2);
    expect(GAMEPLAY_CONFIG.shotHitRadiusPx).toBe(22);
  });

  it('freezes every Classic-critical value behind a compatibility alias', () => {
    expect(CLASSIC_GAMEPLAY_CONFIG).toEqual({
      startingHearts: 2,
      huntDurationMs: 15_000,
      commitDurationMs: 3_000,
      recapDurationMs: 1_500,
      sonarCooldownMs: 3_000,
      sonarPulseRadiusPx: 1_100,
      sonarPulseVisualDurationMs: 500,
      sonarSnapshotDurationMs: 2_000,
      sonarOriginQuantizationPx: 48,
      shotResolutionStepMs: 1_200,
      shotAnticipationMs: 300,
      shotResultHoldMs: 650,
      playerSpeedPxPerSecond: 165,
      playerRadius: 16,
      shotHitRadiusPx: 22,
      overlapSeparationPx: 12,
    });
    expect(GAMEPLAY_CONFIG.playerSpeedPxPerSecond).toBe(
      CLASSIC_GAMEPLAY_CONFIG.playerSpeedPxPerSecond,
    );
    expect(COMMON_GAMEPLAY_CONFIG.maxActiveFighters).toBe(4);
  });

  it('keeps Echo tuning separate from Classic', () => {
    expect(ECHO_GAMEPLAY_CONFIG.startingHearts).toBe(3);
    expect(ECHO_GAMEPLAY_CONFIG.countdownDurationMs).toBe(5_000);
    expect(ECHO_GAMEPLAY_CONFIG.huntDurationMs).toBe(75_000);
    expect(ECHO_GAMEPLAY_CONFIG.fireCooldownMs).toBe(650);
    expect(ECHO_GAMEPLAY_CONFIG.sonarCooldownMs).toBe(10_000);
    expect(ECHO_GAMEPLAY_CONFIG.runSpeedPxPerSecond).toBeGreaterThan(
      ECHO_GAMEPLAY_CONFIG.walkSpeedPxPerSecond,
    );
  });

  it('should keep readable v2 resolution pacing centralized', () => {
    expect(GAMEPLAY_CONFIG.shotResolutionStepMs).toBe(1_200);
    expect(GAMEPLAY_CONFIG.shotAnticipationMs).toBe(300);
    expect(GAMEPLAY_CONFIG.shotResultHoldMs).toBe(650);
    expect(
      GAMEPLAY_CONFIG.shotAnticipationMs + GAMEPLAY_CONFIG.shotResultHoldMs,
    ).toBeLessThanOrEqual(GAMEPLAY_CONFIG.shotResolutionStepMs);
  });

  it('should retain the verified multiplayer network cadence', () => {
    expect(GAMEPLAY_CONFIG.networkUpdateHz).toBeGreaterThanOrEqual(10);
    expect(GAMEPLAY_CONFIG.networkUpdateHz).toBeLessThanOrEqual(15);
    expect(NETWORK_TICK_MS).toBeCloseTo(83.333, 2);
  });
});
