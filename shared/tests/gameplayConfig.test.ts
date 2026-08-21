import { describe, expect, it } from 'vitest';
import { GAMEPLAY_CONFIG, NETWORK_TICK_MS, SONAR_WEDGE_RADIANS } from '../src/index.js';

describe('gameplay configuration', () => {
  it('should keep the MVP planning, sonar, health, and network values centralized', () => {
    expect(GAMEPLAY_CONFIG.planningDurationMs).toBe(10_000);
    expect(GAMEPLAY_CONFIG.sonarRotationPeriodMs).toBe(2_000);
    expect(GAMEPLAY_CONFIG.sonarFadeDurationMs).toBe(1_250);
    expect(GAMEPLAY_CONFIG.startingHearts).toBe(3);
    expect(GAMEPLAY_CONFIG.networkUpdateHz).toBeGreaterThanOrEqual(10);
    expect(GAMEPLAY_CONFIG.networkUpdateHz).toBeLessThanOrEqual(15);
  });

  it('should derive network and sonar values without duplicated literals', () => {
    expect(NETWORK_TICK_MS).toBeCloseTo(83.333, 2);
    expect(SONAR_WEDGE_RADIANS).toBeCloseTo((35 * Math.PI) / 180, 8);
  });
});
