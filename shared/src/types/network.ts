import { z } from 'zod';
import { ECHO_GAMEPLAY_CONFIG, GAMEPLAY_CONFIG } from '../config/gameplayConfig.js';
import type { GameMode, PlayerRole } from './match.js';

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
  mode: z.enum(['echo_hunt', 'classic']).default('echo_hunt'),
});

export const playerInputSchema = z
  .object({
    moveX: z.number().min(-1).max(1),
    moveY: z.number().min(-1).max(1),
    aimAngleRad: z.number().finite(),
    sequence: z.number().int().nonnegative(),
    clientTimeMs: timestampSchema,
    running: z.boolean().optional().default(false),
  })
  .strict();

const actionInputBase = {
  sessionToken: sessionTokenSchema,
  sequence: z.number().int().nonnegative(),
  clientTimeMs: timestampSchema,
};

export const fireInputSchema = z
  .object({ ...actionInputBase, aimAngleRad: z.number().finite() })
  .strict();
export const decoyInputSchema = z
  .object({ ...actionInputBase, aimAngleRad: z.number().finite() })
  .strict();
export const nextMatchInputSchema = z.object({ ...actionInputBase, ready: z.boolean() }).strict();

export const publicSoundCueEventSchema = z
  .object({
    type: z.literal('sound_cue'),
    cueId: z.string().min(1).max(128),
    profile: z.enum(['walk', 'run', 'reload', 'final_echo']),
    approximatePosition: vector2Schema,
    intensity: z.number().min(0).max(1),
    emittedAtServerMs: timestampSchema,
    expiresAtServerMs: timestampSchema,
  })
  .strict();

export const echoActionRejectionReasonSchema = z.enum([
  'wrong_mode',
  'wrong_phase',
  'cooldown',
  'reloading',
  'stale_sequence',
  'unavailable_decoy',
  'eliminated',
  'not_active',
  'invalid_request',
]);

export const privateEchoNoiseEventSchema = z
  .object({
    type: z.literal('echo_noise'),
    noiseId: z.string().min(1).max(128),
    intensity: z.number().min(0).max(1),
    emittedAtServerMs: timestampSchema,
  })
  .strict();
export type PrivateEchoNoiseEvent = z.infer<typeof privateEchoNoiseEventSchema>;

const echoActionStatusBase = {
  type: z.literal('echo_action_status'),
  action: z.enum(['fire', 'reload', 'sonar', 'decoy', 'next_match']),
  requestSequence: z.number().int().nonnegative(),
  fireReadyAtServerMs: timestampSchema,
  ammo: z.number().int().min(0).max(ECHO_GAMEPLAY_CONFIG.magazineSize),
  reloadEndsAtServerMs: timestampSchema,
  sonarReadyAtServerMs: timestampSchema,
  decoyAvailable: z.boolean(),
  serverTimeMs: timestampSchema,
};
export const echoActionStatusEventSchema = z.discriminatedUnion('accepted', [
  z.object({ ...echoActionStatusBase, accepted: z.literal(true) }).strict(),
  z
    .object({
      ...echoActionStatusBase,
      accepted: z.literal(false),
      reason: echoActionRejectionReasonSchema,
    })
    .strict(),
]);

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
export type FireInputMessage = z.infer<typeof fireInputSchema>;
export type DecoyInputMessage = z.infer<typeof decoyInputSchema>;
export type NextMatchInputMessage = z.infer<typeof nextMatchInputSchema>;
export type PublicSoundCueEvent = z.infer<typeof publicSoundCueEventSchema>;
export type EchoActionStatusEvent = z.infer<typeof echoActionStatusEventSchema>;
export type EchoActionRejectionReason = z.infer<typeof echoActionRejectionReasonSchema>;

export interface SessionReadyEvent {
  type: 'session_ready';
  sessionToken: string;
  playerId: string;
  roomId: string;
  roomCode: string;
  mode: GameMode;
  role: PlayerRole;
  isHost: boolean;
  sonarReadyAtServerMs: number;
  fireReadyAtServerMs?: number;
  ammo?: number;
  reloadEndsAtServerMs?: number;
  decoyAvailable?: boolean;
  nextMatchSequence?: number;
  actionSequences?: { fire: number; decoy: number; input: number; sonar: number };
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
