import { describe, expect, it } from 'vitest';
import { firstRayHit, isPointInsideWedge, normalizeAngle, sonarSweepAngle } from '../src/index.js';

describe('sonar geometry', () => {
  it('should complete one rotation using the configured server-time period', () => {
    expect(sonarSweepAngle(1_000, 1_000, 2_000)).toBeCloseTo(0);
    expect(sonarSweepAngle(1_500, 1_000, 2_000)).toBeCloseTo(Math.PI / 2);
    expect(sonarSweepAngle(3_000, 1_000, 2_000)).toBeCloseTo(0);
  });

  it('should detect a point only while the private wedge crosses it', () => {
    const origin = { x: 0, y: 0 };
    expect(isPointInsideWedge(origin, { x: 100, y: 0 }, 0, Math.PI / 6, 500)).toBe(true);
    expect(isPointInsideWedge(origin, { x: 0, y: 100 }, 0, Math.PI / 6, 500)).toBe(false);
  });

  it('should normalize angles across the negative/positive pi boundary', () => {
    expect(normalizeAngle(Math.PI * 3)).toBeCloseTo(-Math.PI);
    expect(normalizeAngle(-Math.PI * 3)).toBeCloseTo(-Math.PI);
  });
});

describe('ray intersection', () => {
  it('should damage only the first living player along a non-piercing ray', () => {
    const hit = firstRayHit(
      { x: 0, y: 0 },
      0,
      [
        { id: 'shooter', center: { x: 0, y: 0 }, radius: 10, alive: true },
        { id: 'far', center: { x: 200, y: 0 }, radius: 10, alive: true },
        { id: 'near', center: { x: 100, y: 0 }, radius: 10, alive: true },
      ],
      'shooter',
    );
    expect(hit?.id).toBe('near');
    expect(hit?.distance).toBeCloseTo(90);
  });

  it('should miss candidates behind the firing origin', () => {
    const hit = firstRayHit(
      { x: 0, y: 0 },
      0,
      [{ id: 'behind', center: { x: -100, y: 0 }, radius: 10, alive: true }],
      'shooter',
    );
    expect(hit).toBeNull();
  });
});
