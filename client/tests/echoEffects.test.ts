import { Scene } from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EchoEffects } from '../src/game-three/renderers/EchoEffects.js';
import { matchViewStore } from '../src/state/matchViewStore.js';
import { echoStore } from '../src/state/echoStore.js';
import { sessionStore } from '../src/state/sessionStore.js';
import { gameAudio } from '../src/audio/GameAudio.js';
vi.mock('../src/audio/GameAudio.js', () => ({ gameAudio: { play: vi.fn() } }));

describe('Echo event rendering', () => {
  afterEach(() => vi.unstubAllGlobals());
  beforeEach(() => {
    vi.clearAllMocks();
    matchViewStore.getState().reset();
    echoStore.getState().reset();
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    sessionStore.getState().setRoomSession({
      playerId: 'local',
      roomId: 'room',
      roomCode: 'ABC234',
      mode: 'echo_hunt',
      sessionToken: 's',
      reconnectToken: 'r',
    });
  });
  it('plays both public reload clicks once, softly and at their approximate positions', () => {
    const scene = new Scene();
    const effects = new EchoEffects(scene);
    for (const [index, time] of [1000, 2800].entries()) {
      matchViewStore.getState().addSoundCue({
        type: 'sound_cue',
        cueId: 'reload-' + index,
        profile: 'reload',
        approximatePosition: { x: 720, y: 270 },
        intensity: 0.25,
        emittedAtServerMs: time,
        expiresAtServerMs: time + 900,
      });
      effects.sync(time);
      effects.sync(time + 20);
      expect(scene.children).toHaveLength(1);
    }
    expect(vi.mocked(gameAudio.play).mock.calls).toEqual([
      ['reload', 0.25, 0.5],
      ['reload', 0.25, 0.5],
    ]);
    effects.sync(4000);
    expect(scene.children).toHaveLength(0);
    effects.clear();
  });

  it('reconciles a predicted shot once and disposes concurrent expiring effects', () => {
    const scene = new Scene();
    const effects = new EchoEffects(scene);
    echoStore.getState().predictShot({
      sequence: 1,
      origin: { x: 100, y: 100 },
      angleRad: 0,
      createdAtServerMs: 1_000,
    });
    effects.sync(1_000);
    matchViewStore.getState().applyShot({
      type: 'shot_resolved',
      shotId: 'a',
      shooterId: 'local',
      targetId: 'other',
      origin: { x: 101, y: 100 },
      end: { x: 300, y: 100 },
      roundNumber: 0,
      cancelled: false,
      fatal: false,
      resolvedAtServerMs: 1_050,
      requestSequence: 1,
    });
    matchViewStore.getState().addSoundCue({
      type: 'sound_cue',
      cueId: 'step',
      profile: 'walk',
      approximatePosition: { x: 900, y: 400 },
      intensity: 0.25,
      emittedAtServerMs: 1_050,
      expiresAtServerMs: 1_950,
    });
    effects.sync(1_050);
    effects.sync(1_100);
    expect(
      vi.mocked(gameAudio.play).mock.calls.filter(([name]) => name === 'gunshot'),
    ).toHaveLength(1);
    expect(vi.mocked(gameAudio.play).mock.calls.filter(([name]) => name === 'walk')).toHaveLength(
      1,
    );
    expect(scene.children.length).toBeGreaterThan(1);
    effects.sync(3_000);
    expect(scene.children).toHaveLength(0);
    effects.clear();
    expect(scene.children).toHaveLength(0);
  });
});
