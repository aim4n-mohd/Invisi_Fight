import { describe, expect, it } from 'vitest';
import { shouldResetEchoInput } from '../src/game-three/ThreeGame.js';

describe('Echo input lifecycle', () => {
  it.each([
    [-1, 0, 'lobby', true],
    [0, 0, 'countdown', false],
    [0, 1, 'echo_hunt', true],
    [1, 1, 'final_echo', false],
    [1, 1, 'results', true],
    [1, 1, 'countdown', false],
    [1, 2, 'echo_hunt', true],
  ] as const)('round %s → %s, phase %s resets input: %s', (previous, current, phase, expected) => {
    expect(shouldResetEchoInput(previous, current, phase)).toBe(expected);
  });
});
