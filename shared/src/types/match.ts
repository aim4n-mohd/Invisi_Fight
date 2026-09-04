export const GAME_MODES = ['echo_hunt', 'classic'] as const;
export type GameMode = (typeof GAME_MODES)[number];
export const CLASSIC_PHASES = [
  'lobby',
  'hunt',
  'commit',
  'resolution',
  'recap',
  'results',
] as const;
export type ClassicPhase = (typeof CLASSIC_PHASES)[number];
export const ECHO_PHASES = ['lobby', 'countdown', 'echo_hunt', 'final_echo', 'results'] as const;
export type EchoPhase = (typeof ECHO_PHASES)[number];
export const MATCH_PHASES = [
  'lobby',
  'countdown',
  'echo_hunt',
  'final_echo',
  'hunt',
  'commit',
  'resolution',
  'recap',
  'results',
] as const;

export type MatchPhase = (typeof MATCH_PHASES)[number];
export type PlayerRole = 'host' | 'player' | 'spectator';
export type ShotLockSource = 'explicit' | 'automatic';
export type ConnectionStatus =
  'idle' | 'checking' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error';

export function isClassicPhase(phase: MatchPhase): phase is ClassicPhase {
  return (CLASSIC_PHASES as readonly string[]).includes(phase);
}

export function isEchoPhase(phase: MatchPhase): phase is EchoPhase {
  return (ECHO_PHASES as readonly string[]).includes(phase);
}

export function isLegalModePhase(mode: GameMode, phase: MatchPhase): boolean {
  return mode === 'classic' ? isClassicPhase(phase) : isEchoPhase(phase);
}

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
  inCurrentRoster: boolean;
  readyForNextMatch: boolean;
  rivalryWins: number;
  resultStats: EchoResultStats | null;
  award: string | null;
}

export interface EchoResultStats {
  shots: number;
  hits: number;
  damage: number;
  eliminations: number;
  sonarDetections: number;
  emittedSound: number;
  closestMissPx: number | null;
  survivalMs: number;
}

export interface PublicMatchState {
  protocolVersion: number;
  revision: number;
  roomId: string;
  roomCode: string;
  mode: GameMode;
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
  requestSequence?: number;
}

export interface PlayerInputMessage {
  moveX: number;
  moveY: number;
  aimAngleRad: number;
  sequence: number;
  clientTimeMs: number;
  running?: boolean;
}

export interface StartMatchMessage {
  sessionToken: string;
}

export interface ReplayToLobbyMessage {
  sessionToken: string;
}
