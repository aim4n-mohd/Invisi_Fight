import { createStore } from 'zustand/vanilla';
import type { PrivatePlayerStateEvent, PrivateSonarSnapshotEvent } from '@invisi-fight/shared';

export interface PrivateSnapshotState {
  playerState: PrivatePlayerStateEvent | null;
  detections: PrivateSonarSnapshotEvent[];
  applyPlayerState: (event: PrivatePlayerStateEvent) => void;
  addDetection: (event: PrivateSonarSnapshotEvent) => void;
  prune: (serverTimeMs: number) => void;
  reset: () => void;
}

export const privateSnapshotStore = createStore<PrivateSnapshotState>((set) => ({
  playerState: null,
  detections: [],
  applyPlayerState: (playerState) =>
    set((state) =>
      state.playerState && playerState.sequence <= state.playerState.sequence
        ? state
        : { playerState },
    ),
  addDetection: (event) =>
    set((state) => ({
      detections: [
        ...state.detections.filter((entry) => entry.snapshotId !== event.snapshotId),
        event,
      ],
    })),
  prune: (serverTimeMs) =>
    set((state) => ({
      detections: state.detections.filter((entry) => entry.expiresAtServerMs > serverTimeMs),
    })),
  reset: () => set({ playerState: null, detections: [] }),
}));
