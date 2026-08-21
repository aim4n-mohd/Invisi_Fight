import {
  GAMEPLAY_CONFIG,
  displayNameSchema,
  roomCodeSchema,
  type MatchPhase,
  type PlayerRole,
} from '@invisi-fight/shared';

export class RoomAuthError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'RoomAuthError';
  }
}

export class RoomAuthService {
  validateDisplayName(value: unknown): string {
    const parsed = displayNameSchema.safeParse(value);
    if (!parsed.success) {
      throw new RoomAuthError(
        'ERR_AUTH_001',
        `Please choose a display name with 1 to ${GAMEPLAY_CONFIG.maxDisplayNameLength} visible characters.`,
      );
    }
    return parsed.data;
  }

  validateRoomCode(value: unknown): string {
    const parsed = roomCodeSchema.safeParse(value);
    if (!parsed.success)
      throw new RoomAuthError('ERR_ROOM_001', 'That room code could not be found.');
    return parsed.data;
  }

  ensureUniqueName(name: string, existingNames: Iterable<string>): void {
    const normalized = name.normalize('NFKC').toLocaleLowerCase('en');
    for (const existingName of existingNames) {
      if (existingName.normalize('NFKC').toLocaleLowerCase('en') === normalized) {
        throw new RoomAuthError('ERR_AUTH_004', 'That display name is already in this room.');
      }
    }
  }

  roleForJoin(phase: MatchPhase, isFirstPlayer: boolean): PlayerRole {
    if (isFirstPlayer) return 'host';
    return phase === 'lobby' ? 'player' : 'spectator';
  }

  assertCanStart(role: PlayerRole, playerCount: number, phase: MatchPhase): void {
    if (role !== 'host')
      throw new RoomAuthError('ERR_ROOM_005', 'Only the room creator can start the match.');
    if (playerCount < GAMEPLAY_CONFIG.minPlayersToStart) {
      throw new RoomAuthError('ERR_ROOM_004', 'At least 2 players are required to start a match.');
    }
    if (phase !== 'lobby')
      throw new RoomAuthError('ERR_ROOM_006', 'The match is already starting.');
  }
}
