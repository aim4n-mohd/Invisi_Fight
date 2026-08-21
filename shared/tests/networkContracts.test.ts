import { describe, expect, it } from 'vitest';
import { displayNameSchema, playerInputSchema, roomCodeSchema } from '../src/index.js';

describe('network boundary contracts', () => {
  it('should normalize valid names and room codes', () => {
    expect(displayNameSchema.parse('  Aiman  ')).toBe('Aiman');
    expect(roomCodeSchema.parse('ab23cd')).toBe('AB23CD');
  });

  it('should reject names and room codes outside the anonymous-room policy', () => {
    expect(() => displayNameSchema.parse('')).toThrow();
    expect(() => displayNameSchema.parse('<script>')).toThrow();
    expect(() => roomCodeSchema.parse('ABC')).toThrow();
    expect(() => roomCodeSchema.parse('AB10CD')).toThrow();
  });

  it('should reject malformed movement and aim input', () => {
    expect(() =>
      playerInputSchema.parse({
        moveX: 2,
        moveY: 0,
        aimAngleRad: 0,
        sequence: 0,
        clientTimeMs: 100,
      }),
    ).toThrow();
  });
});
