import { describe, expect, it } from 'vitest';
import { RoomAuthError, RoomAuthService } from '../src/services/RoomAuthService.js';

describe('RoomAuthService', () => {
  const service = new RoomAuthService();

  it('should make the creator host and late joiners spectators', () => {
    expect(service.roleForJoin('lobby', true)).toBe('host');
    expect(service.roleForJoin('lobby', false)).toBe('player');
    expect(service.roleForJoin('planning', false)).toBe('spectator');
  });

  it('should enforce host-only start and minimum players', () => {
    expect(() => service.assertCanStart('player', 2, 'lobby')).toThrow(RoomAuthError);
    expect(() => service.assertCanStart('host', 1, 'lobby')).toThrow(RoomAuthError);
    expect(() => service.assertCanStart('host', 2, 'lobby')).not.toThrow();
  });

  it('should reject duplicate display names after normalization', () => {
    expect(() => service.ensureUniqueName('AIMAN', ['Aiman'])).toThrow(RoomAuthError);
  });
});
