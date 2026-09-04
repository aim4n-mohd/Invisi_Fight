import type { LocalSonarPulse } from '../state/privateSnapshotStore.js';
import sonarPingUrl from '../assets/audio/sonar-ping.wav?url';
import { gameAudio } from './GameAudio.js';
import { settingsStore } from '../state/settingsStore.js';

interface AudioPlayer {
  currentTime: number;
  volume?: number;
  play(): Promise<void>;
  pause(): void;
}

type AudioFactory = (url: string) => AudioPlayer;

export class SonarPingAudio {
  readonly #audio: AudioPlayer | null;
  #lastRequestSequence: number | null = null;

  constructor(
    readonly enabled: boolean,
    audioFactory?: AudioFactory,
  ) {
    const factory = audioFactory;
    this.#audio = enabled && factory ? factory(sonarPingUrl) : null;
    if (this.#audio) this.#audio.volume = 0.58;
  }

  sync(pulse: LocalSonarPulse | null): void {
    if (!pulse || pulse.requestSequence === this.#lastRequestSequence) return;
    this.#lastRequestSequence = pulse.requestSequence;
    if (!this.enabled) return;
    if (!this.#audio) {
      gameAudio.play('sonar', 0.58);
      return;
    }
    const settings = settingsStore.getState();
    this.#audio.volume = 0.58 * settings.master * settings.sfx;
    this.#audio.currentTime = 0;
    void this.#audio.play().catch(() => undefined);
  }

  dispose(): void {
    this.#audio?.pause();
  }
}
