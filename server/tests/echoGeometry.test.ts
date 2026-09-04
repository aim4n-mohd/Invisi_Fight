import { describe, expect, it } from 'vitest';
import { distanceToBoundary, missDistance } from '../src/services/echoGeometry.js';

describe('Echo shot geometry', () => {
  it('ends misses at the arena boundary in every quadrant', () => {
    expect(distanceToBoundary({ x: 100, y: 100 }, 0)).toBe(860);
    expect(distanceToBoundary({ x: 100, y: 100 }, Math.PI)).toBeCloseTo(100);
    expect(distanceToBoundary({ x: 100, y: 100 }, Math.PI / 2)).toBeCloseTo(440);
    expect(distanceToBoundary({ x: 100, y: 100 }, -Math.PI / 2)).toBeCloseTo(100);
  });
  it('measures closest miss from the finite shot segment to the hit circle', () => {
    expect(missDistance({ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 50, y: 40 }, 26)).toBe(14);
    expect(missDistance({ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 130, y: 0 }, 26)).toBe(4);
  });
});
