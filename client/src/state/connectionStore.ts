import { createStore } from 'zustand/vanilla';
import type { ConnectionStatus } from '@invisi-fight/shared';

export interface ConnectionState {
  status: ConnectionStatus;
  attemptCount: number;
  roomId: string | null;
  roomCode: string | null;
  lastConnectedAtMs: number | null;
  setStatus: (status: ConnectionStatus, attemptCount?: number) => void;
  setRoom: (roomId: string, roomCode: string) => void;
  clear: () => void;
}

export const connectionStore = createStore<ConnectionState>((set) => ({
  status: 'idle',
  attemptCount: 0,
  roomId: null,
  roomCode: null,
  lastConnectedAtMs: null,
  setStatus: (status, attemptCount) =>
    set((state) => ({
      status,
      attemptCount: attemptCount ?? state.attemptCount,
      lastConnectedAtMs: status === 'connected' ? Date.now() : state.lastConnectedAtMs,
    })),
  setRoom: (roomId, roomCode) => set({ roomId, roomCode }),
  clear: () => set({ status: 'idle', attemptCount: 0, roomId: null, roomCode: null }),
}));
