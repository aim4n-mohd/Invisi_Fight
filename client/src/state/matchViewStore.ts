import { createStore } from 'zustand/vanilla';
import type { MatchPhase, PublicPlayerState, ShotResolutionEvent } from '@invisi-fight/shared';

export interface MatchViewData {
  revision: number;
  phase: MatchPhase;
  phaseStartedAtServerMs: number;
  phaseEndsAtServerMs: number | null;
  roundNumber: number;
  activeShooterId: string | null;
  firingOrder: string[];
  winnerPlayerId: string | null;
  players: PublicPlayerState[];
  lastShot: ShotResolutionEvent | null;
}

export interface MatchViewState extends MatchViewData {
  applyPublicState: (state: MatchViewData) => void;
  applyShot: (lastShot: ShotResolutionEvent) => void;
  reset: () => void;
}

const initialState = {
  revision: 0,
  phase: 'lobby' as const,
  phaseStartedAtServerMs: 0,
  phaseEndsAtServerMs: null,
  roundNumber: 0,
  activeShooterId: null,
  firingOrder: [] as string[],
  winnerPlayerId: null,
  players: [] as PublicPlayerState[],
  lastShot: null as ShotResolutionEvent | null,
};

export const matchViewStore = createStore<MatchViewState>((set) => ({
  ...initialState,
  applyPublicState: (state) => set(state),
  applyShot: (lastShot) => set({ lastShot }),
  reset: () => set({ ...initialState }),
}));
