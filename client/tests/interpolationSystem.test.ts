import { describe, expect, it } from 'vitest';
import { InterpolationSystem } from '../src/game/systems/InterpolationSystem.js';

describe('InterpolationSystem', () => {
  it('starts at the first authoritative private position', () => {
    const interpolation = new InterpolationSystem();
    interpolation.setTarget({ x: 120, y: 80 });
    expect(interpolation.update(16)).toEqual({ x: 120, y: 80 });
  });

  it('moves smoothly toward later server positions without overshooting', () => {
    const interpolation = new InterpolationSystem();
    interpolation.setTarget({ x: 0, y: 0 });
    interpolation.setTarget({ x: 100, y: 50 });
    const first = interpolation.update(16)!;
    const second = interpolation.update(16)!;
    expect(first.x).toBeGreaterThan(0);
    expect(second.x).toBeGreaterThan(first.x);
    expect(second.x).toBeLessThan(100);
    expect(second.y).toBeLessThan(50);
  });

  it('forgets private position history on reset', () => {
    const interpolation = new InterpolationSystem();
    interpolation.setTarget({ x: 10, y: 20 });
    interpolation.reset();
    expect(interpolation.update(16)).toBeNull();
  });
});
