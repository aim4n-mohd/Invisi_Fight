import { describe, expect, it } from 'vitest';
import { isDetectionInsideSweep } from '../src/game/systems/SonarRenderSystem.js';

describe('SonarRenderSystem visibility', () => {
  const origin = { x: 100, y: 100 };

  it('shows a detected player only while the visible wedge covers its snapshot', () => {
    expect(isDetectionInsideSweep(origin, { x: 200, y: 100 }, 0)).toBe(true);
    expect(isDetectionInsideSweep(origin, { x: 200, y: 100 }, Math.PI / 2)).toBe(false);
  });
});
