import { describe, expect, it } from 'vitest';
import { MatchClock } from '../src/services/MatchClock.js';

describe('MatchClock', () => {
  it('should derive every timed v2 phase window from server time only', () => {
    const clock = new MatchClock(() => 1_000);
    expect(clock.huntWindow()).toEqual({ startedAtServerMs: 1_000, endsAtServerMs: 16_000 });
    expect(clock.commitWindow()).toEqual({ startedAtServerMs: 1_000, endsAtServerMs: 4_000 });
    expect(clock.recapWindow()).toEqual({ startedAtServerMs: 1_000, endsAtServerMs: 2_500 });
  });

  it('should expire exactly at the authoritative deadline', () => {
    let now = 999;
    const clock = new MatchClock(() => now);
    expect(clock.hasExpired(1_000)).toBe(false);
    now = 1_000;
    expect(clock.hasExpired(1_000)).toBe(true);
  });
});
