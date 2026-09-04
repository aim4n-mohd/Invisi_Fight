import { beforeEach, describe, expect, it } from 'vitest';
import { echoStore, soundLevelAt } from '../src/state/echoStore.js';
import { matchViewStore } from '../src/state/matchViewStore.js';

describe('Echo client event state', () => {
  beforeEach(() => {
    echoStore.getState().reset();
    matchViewStore.getState().reset();
  });
  it('keeps a burst of anonymous cues once each, then expires them', () => {
    const cue = {
      type: 'sound_cue' as const,
      cueId: 'one',
      profile: 'walk' as const,
      approximatePosition: { x: 1, y: 2 },
      intensity: 0.25,
      emittedAtServerMs: 1_000,
      expiresAtServerMs: 2_000,
    };
    matchViewStore.getState().addSoundCue(cue);
    matchViewStore.getState().addSoundCue({ ...cue, cueId: 'two' });
    matchViewStore.getState().addSoundCue(cue);
    expect(matchViewStore.getState().soundCues).toHaveLength(2);
    matchViewStore.getState().pruneEvents(2_001);
    expect(matchViewStore.getState().soundCues).toHaveLength(0);
    matchViewStore.getState().addSoundCue(cue);
    expect(matchViewStore.getState().soundCues).toHaveLength(0);
  });
  it('decays local noise without reading enemy cues', () => {
    echoStore
      .getState()
      .applyNoise({ type: 'echo_noise', noiseId: 'n', intensity: 1, emittedAtServerMs: 1_000 });
    expect(soundLevelAt(1, 1_000, 1_800)).toBeCloseTo(0.5);
    expect(soundLevelAt(1, 1_000, 3_000)).toBe(0);
  });
  it('restores private ammo and reload state, ignores older acknowledgements, and resets the magazine', () => {
    const status = {
      type: 'echo_action_status' as const,
      action: 'reload' as const,
      accepted: true as const,
      requestSequence: 1,
      fireReadyAtServerMs: 0,
      sonarReadyAtServerMs: 0,
      decoyAvailable: true,
      serverTimeMs: 100,
      ammo: 1,
      reloadEndsAtServerMs: 1900,
    };
    echoStore.getState().restore(0, true, 1, 1900);
    expect(echoStore.getState()).toMatchObject({ ammo: 1, reloadEndsAtServerMs: 1900 });
    echoStore.getState().applyStatus(status);
    echoStore
      .getState()
      .applyStatus({ ...status, serverTimeMs: 99, ammo: 3, reloadEndsAtServerMs: 0 });
    expect(echoStore.getState().ammo).toBe(1);
    echoStore
      .getState()
      .applyStatus({ ...status, serverTimeMs: 1900, ammo: 3, reloadEndsAtServerMs: 0 });
    expect(echoStore.getState()).toMatchObject({ ammo: 3, reloadEndsAtServerMs: 0 });
    echoStore.getState().reset();
    expect(echoStore.getState()).toMatchObject({
      ammo: 3,
      reloadEndsAtServerMs: 0,
      lastStatus: null,
    });
  });
  it('caps cue history and preserves server timestamp order across state patches', () => {
    for (let i = 120; i >= 0; i--)
      matchViewStore.getState().addSoundCue({
        type: 'sound_cue',
        cueId: `c${i}`,
        profile: 'walk',
        approximatePosition: { x: 100, y: 100 },
        intensity: 0.25,
        emittedAtServerMs: i,
        expiresAtServerMs: 2_000,
      });
    expect(matchViewStore.getState().soundCues).toHaveLength(96);
    const before = matchViewStore.getState().soundCues;
    matchViewStore.setState({ revision: 2 });
    expect(matchViewStore.getState().soundCues).toBe(before);
    expect(before.map((cue) => cue.emittedAtServerMs)).toEqual(
      [...before.map((cue) => cue.emittedAtServerMs)].sort((a, b) => a - b),
    );
  });
});
