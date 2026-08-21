import { beforeEach, describe, expect, it } from 'vitest';
import { parseRoomSession, sessionStore } from '../src/state/sessionStore.js';

describe('sessionStore', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    sessionStore.setState({ playerName: '', roomSession: null });
  });

  it('should keep opaque room tokens in sessionStorage and never localStorage', () => {
    sessionStore.getState().setRoomSession({
      playerId: 'player-1',
      sessionToken: 's'.repeat(43),
      reconnectToken: 'room:reconnect-token',
      roomId: 'room-1',
      roomCode: 'ABC234',
    });

    expect(sessionStorage.getItem('invisiFight.roomSession')).toContain('reconnect-token');
    expect(JSON.stringify(localStorage)).not.toContain('reconnect-token');
    expect(localStorage.getItem('invisiFight.roomSession')).toBeNull();
  });

  it('should persist only the non-sensitive display name in localStorage', () => {
    sessionStore.getState().setPlayerName('  Aiman  ');
    expect(sessionStore.getState().playerName).toBe('Aiman');
    expect(localStorage.getItem('invisiFight.displayName')).toBe('Aiman');
  });

  it('rejects corrupt or partial room sessions without throwing', () => {
    expect(parseRoomSession('{not-json')).toBeNull();
    expect(parseRoomSession(JSON.stringify({ roomCode: 'ABC234' }))).toBeNull();
  });
});
