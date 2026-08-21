import { describe, expect, it } from 'vitest';
import { GAMEPLAY_CONFIG } from '@invisi-fight/shared';
import { InputRateLimiter } from '../src/services/InputRateLimiter.js';

describe('InputRateLimiter', () => {
  it('caps each player at the configured message rate and opens a new window', () => {
    const limiter = new InputRateLimiter();
    for (let index = 0; index < GAMEPLAY_CONFIG.inputMessageMaxHz; index += 1) {
      expect(limiter.allow('player-1', 1_000)).toBe(true);
    }
    expect(limiter.allow('player-1', 1_999)).toBe(false);
    expect(limiter.allow('player-2', 1_999)).toBe(true);
    expect(limiter.allow('player-1', 2_000)).toBe(true);
  });
});
