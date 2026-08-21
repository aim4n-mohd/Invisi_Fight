import { describe, expect, it } from 'vitest';
import { MatchClock } from '../src/services/MatchClock.js';

describe('MatchClock', () => {
  it('should derive planning deadlines from server time only', () => {
    const clock = new MatchClock(() => 1_000);
    expect(clock.planningWindow()).toEqual({ startedAtServerMs: 1_000, endsAtServerMs: 11_000 });
    expect(clock.hasExpired(999)).toBe(true);
  });
});
