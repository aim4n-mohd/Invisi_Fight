import { describe, expect, it } from 'vitest';
import { PublicPlayerSchema } from '../src/rooms/InvisiFightRoomState.js';

describe('public room state privacy', () => {
  it('never exposes live movement, velocity, or aim fields', () => {
    const publicPlayer = new PublicPlayerSchema();
    const publicKeys = Object.keys(publicPlayer);
    expect(publicKeys).not.toContain('position');
    expect(publicKeys).not.toContain('x');
    expect(publicKeys).not.toContain('y');
    expect(publicKeys).not.toContain('velocity');
    expect(publicKeys).not.toContain('aimAngleRad');
    expect(publicKeys).toContain('revealedX');
    expect(publicKeys).toContain('revealedY');
  });
});
