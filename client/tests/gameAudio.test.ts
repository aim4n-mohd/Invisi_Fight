import { afterEach, describe, expect, it, vi } from 'vitest';

describe('central game audio', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });
  it('does not block entry when the browser denies audio initialization', async () => {
    vi.stubGlobal(
      'AudioContext',
      class {
        constructor() {
          throw new Error('Audio denied');
        }
      },
    );
    const { gameAudio } = await import('../src/audio/GameAudio.js');
    expect(() => gameAudio.unlock()).not.toThrow();
  });
  it('unlocks on request, mixes settings, overlaps cues, and stops arena playback', async () => {
    const gains: Array<{
      gain: { value: number };
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
    }> = [];
    const sources: Array<{
      buffer: unknown;
      loop: boolean;
      onended: (() => void) | null;
      start: ReturnType<typeof vi.fn>;
      stop: ReturnType<typeof vi.fn>;
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
    }> = [];
    const resume = vi.fn(async () => undefined);
    const suspend = vi.fn(async () => undefined);
    vi.stubGlobal(
      'AudioContext',
      class {
        state = 'running';
        destination = {};
        resume = resume;
        suspend = suspend;
        decodeAudioData = vi.fn(async () => ({}));
        createGain() {
          const gain = { gain: { value: 1 }, connect: vi.fn(), disconnect: vi.fn() };
          gains.push(gain);
          return gain;
        }
        createStereoPanner() {
          return { pan: { value: 0 }, connect: vi.fn(), disconnect: vi.fn() };
        }
        createBufferSource() {
          const source = {
            buffer: null as unknown,
            loop: false,
            onended: null as (() => void) | null,
            start: vi.fn(),
            stop: vi.fn(),
            connect: vi.fn(),
            disconnect: vi.fn(),
          };
          sources.push(source);
          return source;
        }
      },
    );
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ arrayBuffer: async () => new ArrayBuffer(1) })),
    );
    const { gameAudio } = await import('../src/audio/GameAudio.js');
    const { settingsStore } = await import('../src/state/settingsStore.js');
    expect(gains).toHaveLength(0);
    gameAudio.unlock();
    const release = gameAudio.enterArena();
    await vi.waitFor(() => expect(sources.some((source) => source.loop)).toBe(true));
    gameAudio.play('walk', 0.25, -0.5);
    gameAudio.play('run', 0.55, 0.5);
    gameAudio.play('reload', 0.65);
    expect(sources.filter((source) => !source.loop)).toHaveLength(3);
    expect(sources.every((source) => source.start.mock.calls.length === 1)).toBe(true);
    settingsStore.getState().setVolume('master', 0);
    expect(gains[0]!.gain.value).toBe(0);
    settingsStore.getState().setVolume('sfx', 0.4);
    expect(gains[1]!.gain.value).toBe(0.4);
    release();
    expect(sources.every((source) => source.stop.mock.calls.length === 1)).toBe(true);
    expect(resume).toHaveBeenCalledOnce();
  });
});
