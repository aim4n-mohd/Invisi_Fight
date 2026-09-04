import gunshot from '../assets/audio/gunshot.wav?url';
import sonar from '../assets/audio/sonar-ping.wav?url';
import walk from '../assets/audio/echo-walk.wav?url';
import run from '../assets/audio/echo-run.wav?url';
import hit from '../assets/audio/echo-hit.wav?url';
import miss from '../assets/audio/echo-miss.wav?url';
import ambient from '../assets/audio/echo-ambient.wav?url';
import reload from '../assets/audio/echo-reload.wav?url';
import { settingsStore } from '../state/settingsStore.js';
import { CLIENT_CONFIG } from '../config/clientConfig.js';

const urls = { gunshot, sonar, walk, run, hit, miss, ambient, reload };
export type SoundName = keyof typeof urls;
const assetGain: Record<SoundName, number> = {
  walk: 3,
  run: 5.7,
  hit: 2.2,
  miss: 1.3,
  gunshot: 0.8,
  sonar: 0.7,
  ambient: 1,
  reload: 4,
};

/** No hidden positions enter audio. Pan is supplied only from public approximate cues. */
class GameAudio {
  #context: AudioContext | null = null;
  #master: GainNode | null = null;
  #sfx: GainNode | null = null;
  #music: GainNode | null = null;
  #buffers = new Map<SoundName, AudioBuffer>();
  #voices = new Set<AudioBufferSourceNode>();
  #ambient: AudioBufferSourceNode | null = null;
  #inArena = false;
  #arenaUsers = 0;

  constructor() {
    settingsStore.subscribe(() => this.#volumes());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) void this.#context?.suspend();
      else if (this.#inArena) void this.#context?.resume().catch(() => undefined);
    });
  }

  enterArena(): () => void {
    this.#arenaUsers += 1;
    this.setArena(true);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.#arenaUsers -= 1;
      if (!this.#arenaUsers) this.setArena(false);
    };
  }

  unlock(): void {
    if (!CLIENT_CONFIG.audioEnabled || typeof AudioContext === 'undefined') return;
    if (!this.#context) {
      let context: AudioContext;
      try {
        context = new AudioContext();
      } catch {
        // Audio is optional: browser/device refusal must never block room entry.
        return;
      }
      this.#context = context;
      this.#master = context.createGain();
      this.#sfx = context.createGain();
      this.#music = context.createGain();
      this.#sfx.connect(this.#master);
      this.#music.connect(this.#master);
      this.#master.connect(context.destination);
      this.#volumes();
      for (const [name, url] of Object.entries(urls)) {
        void fetch(url)
          .then((response) => response.arrayBuffer())
          .then((bytes) => context.decodeAudioData(bytes))
          .then((buffer) => {
            this.#buffers.set(name as SoundName, buffer);
            this.#syncAmbient();
          })
          .catch(() => undefined);
      }
    }
    void this.#context
      .resume()
      .then(() => this.#syncAmbient())
      .catch(() => undefined);
  }

  setArena(active: boolean): void {
    this.#inArena = active;
    if (!active) {
      this.#voices.forEach((voice) => voice.stop());
      this.#voices.clear();
      this.#ambient?.stop();
      this.#ambient = null;
    }
    this.#syncAmbient();
  }

  play(name: Exclude<SoundName, 'ambient'>, volume = 1, pan = 0): void {
    const context = this.#context;
    const buffer = this.#buffers.get(name);
    if (!context || context.state !== 'running' || !buffer || !this.#sfx || !this.#inArena) return;
    if (this.#voices.size >= 48) return;
    const source = context.createBufferSource();
    source.buffer = buffer;
    const gain = context.createGain();
    gain.gain.value = Math.max(0, Math.min(1, volume)) * assetGain[name];
    const panner = context.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    source.connect(gain);
    gain.connect(panner);
    panner.connect(this.#sfx);
    this.#voices.add(source);
    source.onended = () => {
      this.#voices.delete(source);
      source.disconnect();
      gain.disconnect();
      panner.disconnect();
    };
    source.start();
  }

  #volumes(): void {
    const settings = settingsStore.getState();
    if (this.#master) this.#master.gain.value = settings.master;
    if (this.#sfx) this.#sfx.gain.value = settings.sfx;
    if (this.#music) this.#music.gain.value = settings.music * 0.35;
  }

  #syncAmbient(): void {
    if (!this.#inArena || this.#ambient || !this.#context || !this.#music) return;
    const buffer = this.#buffers.get('ambient');
    if (!buffer || this.#context.state !== 'running') return;
    const source = this.#context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(this.#music);
    source.start();
    this.#ambient = source;
  }
}

export const gameAudio = new GameAudio();
