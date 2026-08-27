import { createStore } from 'zustand/vanilla';
import type {
  MatchPhase,
  PublicPlayerState,
  PublicSonarEmissionEvent,
  RecapEntry,
  ShotResolutionEvent,
} from '@invisi-fight/shared';

export interface MatchViewData {
  revision: number;
  phase: MatchPhase;
  phaseStartedAtServerMs: number;
  phaseEndsAtServerMs: number | null;
  roundNumber: number;
  activeShooterId: string | null;
  firingOrder: string[];
  nextFirstShooterId: string | null;
  recapEntries: RecapEntry[];
  winnerPlayerId: string | null;
  players: PublicPlayerState[];
  lastShot: ShotResolutionEvent | null;
}

export interface MatchViewState extends MatchViewData {
  sonarEmissions: PublicSonarEmissionEvent[];
  sonarEmissionCount: number;
  applyPublicState: (state: MatchViewData) => void;
  applyShot: (lastShot: ShotResolutionEvent) => void;
  addSonarEmission: (event: PublicSonarEmissionEvent) => void;
  pruneSonarEmissions: (serverTimeMs: number) => void;
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
  nextFirstShooterId: null,
  recapEntries: [] as RecapEntry[],
  winnerPlayerId: null,
  players: [] as PublicPlayerState[],
  lastShot: null as ShotResolutionEvent | null,
  sonarEmissions: [] as PublicSonarEmissionEvent[],
  sonarEmissionCount: 0,
};

export const matchViewStore = createStore<MatchViewState>((set) => ({
  ...initialState,
  applyPublicState: (state) => set(state),
  applyShot: (lastShot) => set({ lastShot }),
  addSonarEmission: (event) =>
    set((state) => {
      const isNew = !state.sonarEmissions.some((entry) => entry.emissionId === event.emissionId);
      return {
        sonarEmissions: [
          ...state.sonarEmissions.filter((entry) => entry.emissionId !== event.emissionId),
          event,
        ],
        sonarEmissionCount: state.sonarEmissionCount + Number(isNew),
      };
    }),
  pruneSonarEmissions: (serverTimeMs) =>
    set((state) => ({
      sonarEmissions: state.sonarEmissions.filter(
        (entry) => entry.expiresAtServerMs > serverTimeMs,
      ),
    })),
  reset: () => set({ ...initialState }),
}));
