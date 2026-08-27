import { createStore } from 'zustand/vanilla';
import type { MatchPhase } from '@invisi-fight/shared';

const STORAGE_KEY = 'invisiFight.onboarding';
export type OnboardingCue = 'move' | 'scan' | 'aim' | 'lock';
export type OnboardingCompletion = Record<OnboardingCue, boolean>;

const emptyCompletion = (): OnboardingCompletion => ({
  move: false,
  scan: false,
  aim: false,
  lock: false,
});

function readCompletion(): OnboardingCompletion {
  try {
    const value = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '{}') as Record<
      string,
      unknown
    >;
    return {
      move: value.move === true,
      scan: value.scan === true,
      aim: value.aim === true,
      lock: value.lock === true,
    };
  } catch {
    return emptyCompletion();
  }
}

function persist(completed: OnboardingCompletion): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(completed));
  } catch {
    // Visual onboarding still works in memory if browser storage is unavailable.
  }
}

export function activeOnboardingCue(
  phase: MatchPhase,
  completed: OnboardingCompletion,
): OnboardingCue | null {
  if (phase === 'hunt') {
    if (!completed.move) return 'move';
    if (!completed.scan) return 'scan';
  }
  if (phase === 'commit') {
    if (!completed.aim) return 'aim';
    if (!completed.lock) return 'lock';
  }
  return null;
}

interface OnboardingState {
  completed: OnboardingCompletion;
  complete: (cue: OnboardingCue) => void;
  reset: () => void;
}

export const onboardingStore = createStore<OnboardingState>((set) => ({
  completed: readCompletion(),
  complete: (cue) =>
    set((state) => {
      if (state.completed[cue]) return state;
      const completed = { ...state.completed, [cue]: true };
      persist(completed);
      return { completed };
    }),
  reset: () => {
    const completed = emptyCompletion();
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // The in-memory reset is sufficient for the current tab.
    }
    set({ completed });
  },
}));
