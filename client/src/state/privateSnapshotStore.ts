import { createStore } from 'zustand/vanilla';
import {
  GAMEPLAY_CONFIG,
  type PrivatePlayerStateEvent,
  type PrivateSonarSnapshotEvent,
  type ShotLockStatusEvent,
  type SonarStatusEvent,
  type Vector2,
} from '@invisi-fight/shared';

export interface LocalSonarPulse {
  requestSequence: number;
  status: 'predicted' | 'accepted';
  origin: Vector2;
  startedAtServerMs: number;
  expiresAtServerMs: number;
}

export interface SonarRejection {
  requestSequence: number;
  reason: Extract<SonarStatusEvent, { accepted: false }>['reason'];
}

export interface PendingShotLock {
  requestSequence: number;
  aimAngleRad: number;
}

export interface PrivateSnapshotState {
  playerState: PrivatePlayerStateEvent | null;
  detections: PrivateSonarSnapshotEvent[];
  sonarReadyAtServerMs: number;
  localSonarPulse: LocalSonarPulse | null;
  lastSonarRejection: SonarRejection | null;
  lastSonarStatusSequence: number;
  pendingShotLock: PendingShotLock | null;
  shotLockStatus: ShotLockStatusEvent | null;
  lastShotLockStatusSequence: number;
  applyPlayerState: (event: PrivatePlayerStateEvent) => void;
  addDetection: (event: PrivateSonarSnapshotEvent) => void;
  predictSonar: (requestSequence: number, serverTimeMs: number, origin: Vector2) => void;
  applySonarStatus: (event: SonarStatusEvent) => void;
  restoreSonarReadiness: (readyAtServerMs: number) => void;
  cancelSonarPrediction: () => void;
  predictShotLock: (requestSequence: number, aimAngleRad: number) => void;
  applyShotLockStatus: (event: ShotLockStatusEvent) => void;
  restoreShotLock: (event: ShotLockStatusEvent | null) => void;
  clearShotLock: () => void;
  prune: (serverTimeMs: number) => void;
  reset: () => void;
}

export const privateSnapshotStore = createStore<PrivateSnapshotState>((set) => ({
  playerState: null,
  detections: [],
  sonarReadyAtServerMs: 0,
  localSonarPulse: null,
  lastSonarRejection: null,
  lastSonarStatusSequence: -1,
  pendingShotLock: null,
  shotLockStatus: null,
  lastShotLockStatusSequence: -1,
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
  predictSonar: (requestSequence, serverTimeMs, origin) =>
    set({
      localSonarPulse: {
        requestSequence,
        status: 'predicted',
        origin: { ...origin },
        startedAtServerMs: serverTimeMs,
        expiresAtServerMs: serverTimeMs + GAMEPLAY_CONFIG.sonarPulseVisualDurationMs,
      },
      lastSonarRejection: null,
    }),
  applySonarStatus: (event) =>
    set((state) => {
      if (event.requestSequence < state.lastSonarStatusSequence) return state;
      const matchingPulse = state.localSonarPulse?.requestSequence === event.requestSequence;
      if (event.accepted) {
        return {
          sonarReadyAtServerMs: event.readyAtServerMs,
          lastSonarStatusSequence: event.requestSequence,
          lastSonarRejection: null,
          localSonarPulse: matchingPulse
            ? {
                requestSequence: event.requestSequence,
                status: 'accepted',
                origin: { ...state.localSonarPulse!.origin },
                startedAtServerMs: event.activatedAtServerMs,
                expiresAtServerMs:
                  event.activatedAtServerMs + GAMEPLAY_CONFIG.sonarPulseVisualDurationMs,
              }
            : state.localSonarPulse,
        };
      }
      return {
        sonarReadyAtServerMs: event.readyAtServerMs,
        lastSonarStatusSequence: event.requestSequence,
        lastSonarRejection: {
          requestSequence: event.requestSequence,
          reason: event.reason,
        },
        localSonarPulse: matchingPulse ? null : state.localSonarPulse,
      };
    }),
  restoreSonarReadiness: (sonarReadyAtServerMs) =>
    set({
      sonarReadyAtServerMs,
      localSonarPulse: null,
      lastSonarRejection: null,
      lastSonarStatusSequence: -1,
    }),
  cancelSonarPrediction: () => set({ localSonarPulse: null }),
  predictShotLock: (requestSequence, aimAngleRad) =>
    set({ pendingShotLock: { requestSequence, aimAngleRad } }),
  applyShotLockStatus: (event) =>
    set((state) => {
      const automatic = event.accepted && event.lockSource === 'automatic';
      if (!automatic && event.requestSequence < state.lastShotLockStatusSequence) return state;
      return {
        pendingShotLock:
          automatic || state.pendingShotLock?.requestSequence === event.requestSequence
            ? null
            : state.pendingShotLock,
        shotLockStatus: event,
        lastShotLockStatusSequence: automatic
          ? state.lastShotLockStatusSequence
          : event.requestSequence,
      };
    }),
  restoreShotLock: (shotLockStatus) =>
    set({
      pendingShotLock: null,
      shotLockStatus,
      lastShotLockStatusSequence: shotLockStatus?.requestSequence ?? -1,
    }),
  clearShotLock: () =>
    set({
      pendingShotLock: null,
      shotLockStatus: null,
      lastShotLockStatusSequence: -1,
    }),
  prune: (serverTimeMs) =>
    set((state) => ({
      detections: state.detections.filter((entry) => entry.expiresAtServerMs > serverTimeMs),
      localSonarPulse:
        state.localSonarPulse && state.localSonarPulse.expiresAtServerMs > serverTimeMs
          ? state.localSonarPulse
          : null,
    })),
  reset: () =>
    set({
      playerState: null,
      detections: [],
      sonarReadyAtServerMs: 0,
      localSonarPulse: null,
      lastSonarRejection: null,
      lastSonarStatusSequence: -1,
      pendingShotLock: null,
      shotLockStatus: null,
      lastShotLockStatusSequence: -1,
    }),
}));
