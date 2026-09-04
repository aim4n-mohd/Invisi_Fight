import { createStore } from 'zustand/vanilla';

export type VolumeChannel = 'master' | 'music' | 'sfx';
export interface AudioSettings {
  master: number;
  music: number;
  sfx: number;
}
export const SETTINGS_KEY = 'invisi-fight.settings.v3';
const defaults: AudioSettings = { master: 0.8, music: 0.25, sfx: 0.85 };

export function parseSettings(raw: string | null): AudioSettings {
  try {
    const data: unknown = JSON.parse(raw ?? 'null');
    if (!data || typeof data !== 'object' || !('version' in data) || data.version !== 1)
      return { ...defaults };
    return Object.fromEntries(
      Object.entries(defaults).map(([key, fallback]) => {
        const value = (data as Record<string, unknown>)[key];
        return [
          key,
          typeof value === 'number' && Number.isFinite(value)
            ? Math.max(0, Math.min(1, value))
            : fallback,
        ];
      }),
    ) as unknown as AudioSettings;
  } catch {
    return { ...defaults };
  }
}

function load(): AudioSettings {
  try {
    return parseSettings(localStorage.getItem(SETTINGS_KEY));
  } catch {
    return { ...defaults };
  }
}

export const settingsStore = createStore<
  AudioSettings & { setVolume: (channel: VolumeChannel, value: number) => void }
>((set, get) => ({
  ...load(),
  setVolume: (channel, value) => {
    if (!Number.isFinite(value)) return;
    set({ [channel]: Math.max(0, Math.min(1, value)) });
    const { master, music, sfx } = get();
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ version: 1, master, music, sfx }));
    } catch {
      /* Storage is optional. */
    }
  },
}));
