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

export const vector2Schema = z
  .object({
    x: z.number().finite(),
    y: z.number().finite(),
  })
  .strict();

const timestampSchema = z
  .union([z.number(), z.bigint()])
  .transform((value) => Number(value))
  .pipe(z.number().finite().nonnegative());

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
  clientTimeMs: timestampSchema,
});

export const triggerSonarSchema = z
  .object({
    sessionToken: sessionTokenSchema,
    sequence: z.number().int().nonnegative(),
    clientTimeMs: timestampSchema,
  })
  .strict();

export const lockShotSchema = z
  .object({
    sessionToken: sessionTokenSchema,
    aimAngleRad: z.number().finite(),
    sequence: z.number().int().nonnegative(),
    clientTimeMs: timestampSchema,
  })
  .strict();

export const privateSonarSnapshotEventSchema = z
  .object({
    type: z.literal('private_sonar_snapshot'),
    snapshotId: z.string().min(1).max(128),
    detectedPlayerId: z.string().min(1).max(128),
    position: vector2Schema,
    detectedAtServerMs: timestampSchema,
    expiresAtServerMs: timestampSchema,
  })
  .strict();

const sonarStatusBase = {
  type: z.literal('sonar_status'),
  requestSequence: z.number().int().nonnegative(),
  readyAtServerMs: timestampSchema,
};

export const sonarStatusEventSchema = z.discriminatedUnion('accepted', [
  z
    .object({
      ...sonarStatusBase,
      accepted: z.literal(true),
      activatedAtServerMs: timestampSchema,
    })
    .strict(),
  z
    .object({
      ...sonarStatusBase,
      accepted: z.literal(false),
      reason: z.enum(['cooldown', 'wrong_phase', 'not_active', 'invalid_request']),
    })
    .strict(),
]);

export const publicSonarEmissionEventSchema = z
  .object({
    type: z.literal('sonar_emission'),
    emissionId: z.string().min(1).max(128),
    emitterId: z.string().min(1).max(128),
    approximateOrigin: vector2Schema,
    radius: z.number().finite().positive(),
    emittedAtServerMs: timestampSchema,
    expiresAtServerMs: timestampSchema,
  })
  .strict();

const shotLockStatusBase = {
  type: z.literal('shot_lock_status'),
  requestSequence: z.number().int().nonnegative(),
  serverTimeMs: timestampSchema,
};

export const shotLockStatusEventSchema = z.discriminatedUnion('accepted', [
  z
    .object({
      ...shotLockStatusBase,
      accepted: z.literal(true),
      lockedAimAngleRad: z.number().finite(),
      lockSource: z.enum(['explicit', 'automatic']),
      replaced: z.boolean(),
    })
    .strict(),
  z
    .object({
      ...shotLockStatusBase,
      accepted: z.literal(false),
      reason: z.enum(['wrong_phase', 'not_active', 'invalid_request', 'stale_sequence']),
    })
    .strict(),
]);

export type TriggerSonarMessage = z.infer<typeof triggerSonarSchema>;
export type SonarStatusEvent = z.infer<typeof sonarStatusEventSchema>;
export type PublicSonarEmissionEvent = z.infer<typeof publicSonarEmissionEventSchema>;
export type LockShotMessage = z.infer<typeof lockShotSchema>;
export type ShotLockStatusEvent = z.infer<typeof shotLockStatusEventSchema>;
export type AcceptedShotLockStatusEvent = Extract<ShotLockStatusEvent, { accepted: true }>;

export interface SessionReadyEvent {
  type: 'session_ready';
  sessionToken: string;
  playerId: string;
  roomId: string;
  roomCode: string;
  role: PlayerRole;
  isHost: boolean;
  sonarReadyAtServerMs: number;
  shotLockStatus: AcceptedShotLockStatusEvent | null;
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
