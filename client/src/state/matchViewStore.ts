import { createStore } from 'zustand/vanilla';
import { ECHO_GAMEPLAY_CONFIG } from '@invisi-fight/shared';
import type {
  GameMode,
  MatchPhase,
  PublicPlayerState,
  PublicSonarEmissionEvent,
  PublicSoundCueEvent,
  RecapEntry,
  ShotResolutionEvent,
} from '@invisi-fight/shared';

export interface MatchViewData {
  revision: number;
  mode: GameMode;
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
  shotEvents: ShotResolutionEvent[];
  soundCues: PublicSoundCueEvent[];
  applyPublicState: (state: MatchViewData) => void;
  applyShot: (lastShot: ShotResolutionEvent) => void;
  addSoundCue: (event: PublicSoundCueEvent) => void;
  addSonarEmission: (event: PublicSonarEmissionEvent) => void;
  pruneSonarEmissions: (serverTimeMs: number) => void;
  pruneEvents: (serverTimeMs: number) => void;
  clearTransientEvents: (sinceServerMs?: number) => void;
  reset: () => void;
}

const initialState = {
  revision: 0,
  mode: 'echo_hunt' as const,
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
  shotEvents: [] as ShotResolutionEvent[],
  soundCues: [] as PublicSoundCueEvent[],
};

const seenShots = new Set<string>();
const seenCues = new Set<string>();
function firstEvent(seen: Set<string>, id: string): boolean {
  if (seen.has(id)) return false;
  seen.add(id);
  if (seen.size > ECHO_GAMEPLAY_CONFIG.eventQueueLimit * 4)
    seen.delete(seen.values().next().value!);
  return true;
}

export const matchViewStore = createStore<MatchViewState>((set) => ({
  ...initialState,
  applyPublicState: (state) => set(state),
  applyShot: (lastShot) =>
    set((state) => {
      const existing = !firstEvent(seenShots, lastShot.shotId);
      if (existing) return state;
      return {
        lastShot,
        shotEvents: [...state.shotEvents, lastShot]
          .sort((left, right) => left.resolvedAtServerMs - right.resolvedAtServerMs)
          .slice(-ECHO_GAMEPLAY_CONFIG.eventQueueLimit),
      };
    }),
  addSoundCue: (event) =>
    set((state) => ({
      soundCues: !firstEvent(seenCues, event.cueId)
        ? state.soundCues
        : [...state.soundCues, event]
            .sort((left, right) => left.emittedAtServerMs - right.emittedAtServerMs)
            .slice(-ECHO_GAMEPLAY_CONFIG.eventQueueLimit),
    })),
  addSonarEmission: (event) =>
    set((state) => {
      const isNew = !state.sonarEmissions.some((entry) => entry.emissionId === event.emissionId);
      return {
        sonarEmissions: [
          ...state.sonarEmissions.filter((entry) => entry.emissionId !== event.emissionId),
          event,
        ].slice(-ECHO_GAMEPLAY_CONFIG.eventQueueLimit),
        sonarEmissionCount: state.sonarEmissionCount + Number(isNew),
      };
    }),
  pruneSonarEmissions: (serverTimeMs) =>
    set((state) => {
      const sonarEmissions = state.sonarEmissions.filter(
        (entry) => entry.expiresAtServerMs > serverTimeMs,
      );
      return sonarEmissions.length === state.sonarEmissions.length ? state : { sonarEmissions };
    }),
  pruneEvents: (serverTimeMs) =>
    set((state) => {
      const soundCues = state.soundCues.filter((entry) => entry.expiresAtServerMs > serverTimeMs);
      const shotEvents = state.shotEvents.filter(
        (entry) => serverTimeMs - entry.resolvedAtServerMs < 2_000,
      );
      return soundCues.length === state.soundCues.length &&
        shotEvents.length === state.shotEvents.length
        ? state
        : { soundCues, shotEvents };
    }),
  clearTransientEvents: (sinceServerMs = Infinity) =>
    set((state) => ({
      shotEvents: state.shotEvents.filter((shot) => shot.resolvedAtServerMs >= sinceServerMs),
      soundCues: state.soundCues.filter((cue) => cue.emittedAtServerMs >= sinceServerMs),
      sonarEmissions: state.sonarEmissions.filter(
        (emission) => emission.emittedAtServerMs >= sinceServerMs,
      ),
      lastShot:
        state.lastShot && state.lastShot.resolvedAtServerMs >= sinceServerMs
          ? state.lastShot
          : null,
    })),
  reset: () => {
    seenShots.clear();
    seenCues.clear();
    set({ ...initialState });
  },
}));
