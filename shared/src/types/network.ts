import { z } from 'zod';
import { GAMEPLAY_CONFIG } from '../config/gameplayConfig.js';
import type { PlayerRole } from './match.js';

export const displayNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(GAMEPLAY_CONFIG.maxDisplayNameLength)
  .regex(/^[\p{L}\p{N} _.-]+$/u);

export const roomCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(new RegExp(`^[A-Z2-9]{${GAMEPLAY_CONFIG.roomCodeLength}}$`));

export const sessionTokenSchema = z.string().min(32).max(256);

export const roomJoinOptionsSchema = z.object({
  playerName: displayNameSchema,
  roomCode: roomCodeSchema.optional(),
  sessionToken: sessionTokenSchema.optional(),
});

export const playerInputSchema = z.object({
  moveX: z.number().min(-1).max(1),
  moveY: z.number().min(-1).max(1),
  aimAngleRad: z.number().finite(),
  sequence: z.number().int().nonnegative(),
  clientTimeMs: z.number().finite(),
});

export interface SessionReadyEvent {
  type: 'session_ready';
  sessionToken: string;
  playerId: string;
  roomId: string;
  roomCode: string;
  role: PlayerRole;
  isHost: boolean;
  reconnectToken?: string;
  serverTimeMs: number;
}

export interface ErrorEvent {
  type: 'error';
  code: string;
  message: string;
  retryable: boolean;
}

export type RoomJoinOptions = z.infer<typeof roomJoinOptionsSchema>;
