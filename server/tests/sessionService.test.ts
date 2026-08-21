import { describe, expect, it } from 'vitest';
import { SessionService } from '../src/services/SessionService.js';

describe('SessionService', () => {
  it('should issue, verify, rotate, and revoke opaque room sessions', () => {
    const service = new SessionService();
    const token = service.issue({
      roomId: 'room-1',
      playerId: 'player-1',
      role: 'host',
      expiresAtMs: 10_000,
    });

    expect(token.length).toBeGreaterThanOrEqual(32);
    expect(service.verify(token, 'room-1', 1_000)?.playerId).toBe('player-1');
    expect(service.verify(token, 'other-room', 1_000)).toBeNull();
    const rotated = service.rotate(token, 1_000);
    expect(rotated).not.toBeNull();
    expect(service.verify(token, 'room-1', 1_000)).toBeNull();
    expect(service.verify(rotated ?? '', 'room-1', 1_000)?.role).toBe('host');
    expect(service.revoke(rotated ?? '')).toBe(true);
    expect(service.verify(rotated ?? '', 'room-1', 1_000)).toBeNull();
  });

  it('should reject expired sessions', () => {
    const service = new SessionService();
    const token = service.issue({
      roomId: 'room-1',
      playerId: 'p1',
      role: 'player',
      expiresAtMs: 50,
    });
    expect(service.verify(token, 'room-1', 51)).toBeNull();
  });
});
