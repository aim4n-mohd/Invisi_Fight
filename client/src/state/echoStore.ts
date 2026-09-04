import { createStore } from 'zustand/vanilla';
import {
  ECHO_GAMEPLAY_CONFIG as ECHO,
  type EchoActionStatusEvent,
  type PrivateEchoNoiseEvent,
  type Vector2,
} from '@invisi-fight/shared';

export interface PredictedShot {
  sequence: number;
  origin: Vector2;
  angleRad: number;
  createdAtServerMs: number;
}

export function soundLevelAt(level: number, emittedAt: number, now: number): number {
  return Math.max(
    0,
    Math.min(1, level * (1 - Math.max(0, now - emittedAt) / ECHO.soundMeterDecayMs)),
  );
}

interface EchoPrivateState {
  fireReadyAtServerMs: number;
  ammo: number;
  reloadEndsAtServerMs: number;
  decoyAvailable: boolean;
  lastStatus: EchoActionStatusEvent | null;
  predictions: PredictedShot[];
  noiseLevel: number;
  noiseAtServerMs: number;
  restore: (
    fireReadyAt: number,
    decoyAvailable: boolean,
    ammo?: number,
    reloadEndsAt?: number,
  ) => void;
  applyStatus: (event: EchoActionStatusEvent) => void;
  predictShot: (shot: PredictedShot) => void;
  applyNoise: (event: PrivateEchoNoiseEvent) => void;
  prune: (now: number) => void;
  reset: () => void;
}

const initial = {
  fireReadyAtServerMs: 0,
  ammo: ECHO.magazineSize,
  reloadEndsAtServerMs: 0,
  decoyAvailable: false,
  lastStatus: null,
  predictions: [] as PredictedShot[],
  noiseLevel: 0,
  noiseAtServerMs: 0,
};

export const echoStore = createStore<EchoPrivateState>((set) => ({
  ...initial,
  restore: (
    fireReadyAtServerMs,
    decoyAvailable,
    ammo = ECHO.magazineSize,
    reloadEndsAtServerMs = 0,
  ) => set({ fireReadyAtServerMs, decoyAvailable, ammo, reloadEndsAtServerMs }),
  applyStatus: (event) =>
    set((state) =>
      state.lastStatus && event.serverTimeMs < state.lastStatus.serverTimeMs
        ? state
        : {
            fireReadyAtServerMs: event.fireReadyAtServerMs,
            ammo: event.ammo,
            reloadEndsAtServerMs: event.reloadEndsAtServerMs,
            decoyAvailable: event.decoyAvailable,
            lastStatus: event,
            predictions:
              !event.accepted && event.action === 'fire'
                ? state.predictions.filter((shot) => shot.sequence !== event.requestSequence)
                : state.predictions,
          },
    ),
  predictShot: (shot) => set((state) => ({ predictions: [...state.predictions, shot].slice(-8) })),
  applyNoise: (event) =>
    set((state) => ({
      noiseLevel: Math.max(
        event.intensity,
        soundLevelAt(state.noiseLevel, state.noiseAtServerMs, event.emittedAtServerMs),
      ),
      noiseAtServerMs: Math.max(state.noiseAtServerMs, event.emittedAtServerMs),
    })),
  prune: (now) =>
    set((state) => {
      const predictions = state.predictions.filter((shot) => now - shot.createdAtServerMs < 2_000);
      return predictions.length === state.predictions.length ? state : { predictions };
    }),
  reset: () => set({ ...initial }),
}));
