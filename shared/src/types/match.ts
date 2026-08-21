export type MatchPhase = 'lobby' | 'planning' | 'resolution' | 'results';
export type PlayerRole = 'host' | 'player' | 'spectator';
export type ConnectionStatus =
  'idle' | 'connecting' | 'waking' | 'connected' | 'reconnecting' | 'disconnected' | 'error';

export interface Vector2 {
  x: number;
  y: number;
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
  type: 'private_sonar';
  snapshotId: string;
  detectedPlayerId: string;
  position: Vector2;
  detectedAtServerMs: number;
  expiresAtServerMs: number;
  sweepAngleRad: number;
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
