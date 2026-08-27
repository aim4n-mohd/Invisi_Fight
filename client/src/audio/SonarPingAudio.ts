import type { LocalSonarPulse } from '../state/privateSnapshotStore.js';
import sonarPingUrl from '../assets/audio/sonar-ping.wav?url';

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

  constructor(enabled: boolean, audioFactory?: AudioFactory) {
    const factory =
      audioFactory ??
      (typeof Audio !== 'undefined' ? (url: string): AudioPlayer => new Audio(url) : null);
    this.#audio = enabled && factory ? factory(sonarPingUrl) : null;
    if (this.#audio) this.#audio.volume = 0.58;
  }

  sync(pulse: LocalSonarPulse | null): void {
    if (!pulse || pulse.requestSequence === this.#lastRequestSequence) return;
    this.#lastRequestSequence = pulse.requestSequence;
    if (!this.#audio) return;
    this.#audio.currentTime = 0;
    void this.#audio.play().catch(() => undefined);
  }

  dispose(): void {
    this.#audio?.pause();
  }
}
