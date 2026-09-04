import { createStore } from 'zustand/vanilla';
import { z } from 'zod';
import type { GameMode } from '@invisi-fight/shared';

const SESSION_KEY = 'invisiFight.roomSession';
const NAME_KEY = 'invisiFight.displayName';

export interface RoomSession {
  playerId: string;
  sessionToken: string;
  reconnectToken: string;
  roomId: string;
  roomCode: string;
  mode: GameMode;
}

export interface SessionState {
  playerName: string;
  roomSession: RoomSession | null;
  setPlayerName: (playerName: string) => void;
  setRoomSession: (session: RoomSession) => void;
  clearRoomSession: () => void;
}

const roomSessionSchema = z.object({
  playerId: z.string().min(1),
  sessionToken: z.string().min(1),
  reconnectToken: z.string().min(1),
  roomId: z.string().min(1),
  roomCode: z.string().regex(/^[A-Z2-9]{6}$/),
  mode: z.enum(['echo_hunt', 'classic']).default('classic'),
});

export function parseRoomSession(value: string | null): RoomSession | null {
  if (!value) return null;
  try {
    const parsed = roomSessionSchema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function readRoomSession(): RoomSession | null {
  try {
    return parseRoomSession(sessionStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

function readPlayerName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? '';
  } catch {
    return '';
  }
}

export const sessionStore = createStore<SessionState>((set) => ({
  playerName: readPlayerName(),
  roomSession: readRoomSession(),
  setPlayerName(playerName) {
    const normalized = playerName.trim();
    try {
      localStorage.setItem(NAME_KEY, normalized);
    } catch {
      // Storage can be blocked; in-memory state still works for this tab.
    }
    set({ playerName: normalized });
  },
  setRoomSession(roomSession) {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(roomSession));
    } catch {
      // The session remains usable in memory when storage access is blocked.
    }
    set({ roomSession });
  },
  clearRoomSession() {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // Clearing in memory is sufficient for the current tab.
    }
    set({ roomSession: null });
  },
}));
