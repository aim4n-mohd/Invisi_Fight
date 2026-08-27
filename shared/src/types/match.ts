export const MATCH_PHASES = ['lobby', 'hunt', 'commit', 'resolution', 'recap', 'results'] as const;

export type MatchPhase = (typeof MATCH_PHASES)[number];
export type PlayerRole = 'host' | 'player' | 'spectator';
export type ShotLockSource = 'explicit' | 'automatic';
export type ConnectionStatus =
  'idle' | 'connecting' | 'waking' | 'connected' | 'reconnecting' | 'disconnected' | 'error';

export interface Vector2 {
  x: number;
  y: number;
}

export type RecapOutcome = 'hit' | 'miss' | 'cancelled';

export interface RecapEntry {
  shotId: string;
  orderIndex: number;
  shooterId: string;
  outcome: RecapOutcome;
  targetId: string | null;
  targetHeartsRemaining: number | null;
  fatal: boolean;
  resolvedAtServerMs: number;
}

export interface PublicPlayerState {
  playerId: string;
  displayName: string;
  role: PlayerRole;
  hearts: number;
  connected: boolean;
  alive: boolean;
  isHost: boolean;
  revealedPosition: Vector2 | null;
  lockedAimAngleRad: number | null;
}

export interface PublicMatchState {
  protocolVersion: number;
  revision: number;
  roomId: string;
  roomCode: string;
  phase: MatchPhase;
  phaseStartedAtServerMs: number;
  phaseEndsAtServerMs: number | null;
  roundNumber: number;
  hostPlayerId: string | null;
  activeShooterId: string | null;
  firingOrder: string[];
  nextFirstShooterId: string | null;
  recapEntries: RecapEntry[];
  winnerPlayerId: string | null;
  players: PublicPlayerState[];
}

export interface PrivatePlayerStateEvent {
  type: 'private_state';
  playerId: string;
  position: Vector2;
  velocity: Vector2;
  aimAngleRad: number;
  serverTimeMs: number;
  sequence: number;
}

export interface PrivateSonarSnapshotEvent {
  type: 'private_sonar_snapshot';
  snapshotId: string;
  detectedPlayerId: string;
  position: Vector2;
  detectedAtServerMs: number;
  expiresAtServerMs: number;
}

export interface ShotResolutionEvent {
  type: 'shot_resolved';
  shotId: string;
  roundNumber: number;
  shooterId: string;
  targetId: string | null;
  origin: Vector2;
  end: Vector2;
  cancelled: boolean;
  fatal: boolean;
  resolvedAtServerMs: number;
}

export interface PlayerInputMessage {
  moveX: number;
  moveY: number;
  aimAngleRad: number;
  sequence: number;
  clientTimeMs: number;
}

export interface StartMatchMessage {
  sessionToken: string;
}

export interface ReplayToLobbyMessage {
  sessionToken: string;
}
