import { beforeEach, describe, expect, it } from 'vitest';
import { activeOnboardingCue, onboardingStore } from '../src/state/onboardingStore.js';

describe('onboardingStore', () => {
  beforeEach(() => onboardingStore.getState().reset());

  it('advances contextual cues without blocking phase order', () => {
    expect(activeOnboardingCue('hunt', onboardingStore.getState().completed)).toBe('move');
    onboardingStore.getState().complete('move');
    expect(activeOnboardingCue('hunt', onboardingStore.getState().completed)).toBe('scan');
    onboardingStore.getState().complete('scan');
    expect(activeOnboardingCue('hunt', onboardingStore.getState().completed)).toBeNull();
    expect(activeOnboardingCue('commit', onboardingStore.getState().completed)).toBe('aim');
    onboardingStore.getState().complete('aim');
    expect(activeOnboardingCue('commit', onboardingStore.getState().completed)).toBe('lock');
    onboardingStore.getState().complete('lock');
    expect(activeOnboardingCue('commit', onboardingStore.getState().completed)).toBeNull();
  });

  it('persists only boolean completion flags for the browser session', () => {
    onboardingStore.getState().complete('scan');
    const stored = sessionStorage.getItem('invisiFight.onboarding');
    expect(stored).toContain('"scan":true');
    expect(stored).not.toContain('player');
    expect(stored).not.toContain('token');
  });
});
