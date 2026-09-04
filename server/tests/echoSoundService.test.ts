import { describe, expect, it } from 'vitest';
import { ECHO_GAMEPLAY_CONFIG } from '@invisi-fight/shared';
import { EchoSoundService } from '../src/services/EchoSoundService.js';

describe('EchoSoundService', () => {
  it('gives reload clicks exactly the walking variance, intensity, lifetime and anonymous shape', () => {
    const service = new EchoSoundService(() => 0.5);
    const walk = service.createCue('walk', { x: 480, y: 270 }, 1000);
    const reload = service.createCue('reload', { x: 480, y: 270 }, 1000);
    expect(reload).toEqual({ ...walk, cueId: reload.cueId, profile: 'reload' });
    expect(reload.approximatePosition).not.toEqual({ x: 480, y: 270 });
  });
  it('stops a diagonal decoy at its first arena boundary instead of sliding', () => {
    const trail = new EchoSoundService(() => 0).decoyTrail({ x: 950, y: 300 }, Math.PI / 4, 0);
    for (const cue of trail) {
      expect(cue.approximatePosition.x).toBeCloseTo(960);
      expect(cue.approximatePosition.y).toBeCloseTo(310);
    }
  });
  it('emits only after authoritative displacement and cadence', () => {
    const service = new EchoSoundService(() => 0);
    expect(service.recordMovement('p1', { x: 10, y: 10 }, { x: 10, y: 10 }, false, 0)).toBeNull();
    expect(service.recordMovement('p1', { x: 10, y: 10 }, { x: 20, y: 10 }, false, 100)).toBeNull();
    const cue = service.recordMovement(
      'p1',
      { x: 20, y: 10 },
      { x: 30, y: 10 },
      false,
      ECHO_GAMEPLAY_CONFIG.walkCueCadenceMs + 1,
    );
    expect(cue).toMatchObject({ profile: 'walk', intensity: ECHO_GAMEPLAY_CONFIG.walkIntensity });
    expect(cue).not.toHaveProperty('playerId');
  });

  it('bounds approximate coordinates and makes decoy steps wire-identical to walking', () => {
    const service = new EchoSoundService(() => 0.5);
    const cue = service.createCue('run', { x: 959, y: 539 }, 1_000);
    expect(cue.approximatePosition.x).toBeGreaterThanOrEqual(0);
    expect(cue.approximatePosition.x).toBeLessThanOrEqual(960);
    expect(cue.approximatePosition.y).toBeGreaterThanOrEqual(0);
    expect(cue.approximatePosition.y).toBeLessThanOrEqual(540);
    const trail = service.decoyTrail({ x: 900, y: 500 }, 0, 2_000);
    expect(trail).toHaveLength(ECHO_GAMEPLAY_CONFIG.decoyStepCount);
    trail.forEach((step) => {
      expect(step.profile).toBe('walk');
      expect(Object.keys(step).sort()).toEqual(
        Object.keys(service.createCue('walk', { x: 1, y: 1 }, 0)).sort(),
      );
      expect(step.approximatePosition.x).toBeLessThanOrEqual(960);
    });
  });
});
