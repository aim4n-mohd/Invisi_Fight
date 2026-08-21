import { createStore } from 'zustand/vanilla';

export type AppScreen = 'landing' | 'connecting' | 'lobby' | 'match' | 'spectator' | 'results';

export interface UiState {
  screen: AppScreen;
  busy: boolean;
  statusMessage: string;
  errorMessage: string | null;
  setScreen: (screen: AppScreen) => void;
  setBusy: (busy: boolean, statusMessage?: string) => void;
  setError: (errorMessage: string | null) => void;
}

export const uiStore = createStore<UiState>((set) => ({
  screen: 'landing',
  busy: false,
  statusMessage: '',
  errorMessage: null,
  setScreen: (screen) =>
    set((state) =>
      state.screen === screen && state.errorMessage === null
        ? state
        : { screen, errorMessage: null },
    ),
  setBusy: (busy, statusMessage = '') => set({ busy, statusMessage }),
  setError: (errorMessage) => set({ errorMessage, busy: false }),
}));
