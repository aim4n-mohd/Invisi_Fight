import { ArraySchema, MapSchema, Schema, defineTypes } from '@colyseus/schema';
import {
  GAMEPLAY_CONFIG,
  type GameMode,
  type MatchPhase,
  type PlayerRole,
} from '@invisi-fight/shared';

export class EchoResultStatsSchema extends Schema {
  shots = 0;
  hits = 0;
  damage = 0;
  eliminations = 0;
  sonarDetections = 0;
  emittedSound = 0;
  closestMissPx = -1;
  survivalMs = 0;
}

defineTypes(EchoResultStatsSchema, {
  shots: 'number',
  hits: 'number',
  damage: 'number',
  eliminations: 'number',
  sonarDetections: 'number',
  emittedSound: 'number',
  closestMissPx: 'number',
  survivalMs: 'number',
});

export class PublicPlayerSchema extends Schema {
  playerId = '';
  displayName = '';
  role: PlayerRole = 'player';
  hearts: number = GAMEPLAY_CONFIG.startingHearts;
  connected = true;
  alive = true;
  isHost = false;
  revealedX = -1;
  revealedY = -1;
  lockedAimAngleRad = 0;
  inCurrentRoster = false;
  readyForNextMatch = false;
  rivalryWins = 0;
  award = '';
  resultStats = new EchoResultStatsSchema();
}

export class RecapEntrySchema extends Schema {
  shotId = '';
  orderIndex = 0;
  shooterId = '';
  outcome = 'miss';
  targetId = '';
  targetHeartsRemaining = -1;
  fatal = false;
  resolvedAtServerMs = 0;
}

defineTypes(RecapEntrySchema, {
  shotId: 'string',
  orderIndex: 'number',
  shooterId: 'string',
  outcome: 'string',
  targetId: 'string',
  targetHeartsRemaining: 'number',
  fatal: 'boolean',
  resolvedAtServerMs: 'number',
});

defineTypes(PublicPlayerSchema, {
  playerId: 'string',
  displayName: 'string',
  role: 'string',
  hearts: 'number',
  connected: 'boolean',
  alive: 'boolean',
  isHost: 'boolean',
  revealedX: 'number',
  revealedY: 'number',
  lockedAimAngleRad: 'number',
  inCurrentRoster: 'boolean',
  readyForNextMatch: 'boolean',
  rivalryWins: 'number',
  award: 'string',
  resultStats: EchoResultStatsSchema,
});

export class InvisiFightRoomState extends Schema {
  protocolVersion = GAMEPLAY_CONFIG.protocolVersion;
  revision = 0;
  roomCode = '';
  mode: GameMode = 'echo_hunt';
  phase: MatchPhase = 'lobby';
  phaseStartedAtServerMs = Date.now();
  phaseEndsAtServerMs = 0;
  roundNumber = 0;
  hostPlayerId = '';
  activeShooterId = '';
  winnerPlayerId = '';
  nextFirstShooterId = '';
  players = new MapSchema<PublicPlayerSchema>();
  firingOrder = new ArraySchema<string>();
  recapEntries = new ArraySchema<RecapEntrySchema>();

  constructor(roomCode = '', mode: GameMode = 'echo_hunt') {
    super();
    this.roomCode = roomCode;
    this.mode = mode;
  }
}

defineTypes(InvisiFightRoomState, {
  protocolVersion: 'number',
  revision: 'number',
  roomCode: 'string',
  mode: 'string',
  phase: 'string',
  phaseStartedAtServerMs: 'number',
  phaseEndsAtServerMs: 'number',
  roundNumber: 'number',
  hostPlayerId: 'string',
  activeShooterId: 'string',
  winnerPlayerId: 'string',
  nextFirstShooterId: 'string',
  players: { map: PublicPlayerSchema },
  firingOrder: ['string'],
  recapEntries: [RecapEntrySchema],
});
