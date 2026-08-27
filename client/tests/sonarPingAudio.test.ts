import { describe, expect, it, vi } from 'vitest';
import { SonarPingAudio } from '../src/audio/SonarPingAudio.js';

describe('SonarPingAudio', () => {
  it('plays once for each local pulse request sequence', () => {
    const play = vi.fn(() => Promise.resolve());
    const pause = vi.fn();
    const audio = { currentTime: 2, play, pause };
    const ping = new SonarPingAudio(true, () => audio);
    const pulse = {
      requestSequence: 1,
      origin: { x: 100, y: 100 },
      startedAtServerMs: 1_000,
      expiresAtServerMs: 1_500,
      status: 'predicted' as const,
    };

    ping.sync(pulse);
    ping.sync({ ...pulse, status: 'accepted' });
    ping.sync({ ...pulse, requestSequence: 2 });

    expect(play).toHaveBeenCalledTimes(2);
    expect(audio.currentTime).toBe(0);
    ping.dispose();
    expect(pause).toHaveBeenCalledOnce();
  });
});
