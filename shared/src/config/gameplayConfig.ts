export const GAMEPLAY_CONFIG = Object.freeze({
  protocolVersion: 1,
  minPlayersToStart: 2,
  startingHearts: 3,
  planningDurationMs: 10_000,
  sonarRotationPeriodMs: 2_000,
  sonarWedgeDegrees: 35,
  sonarFadeDurationMs: 1_250,
  shotResolutionPauseMs: 350,
  networkUpdateHz: 12,
  reconnectGraceMs: 15_000,
  arenaWidth: 960,
  arenaHeight: 540,
  playerRadius: 16,
  playerSpeedPxPerSecond: 190,
  overlapSeparationPx: 12,
  lockedShotRangePx: 5_000,
  roomCodeLength: 6,
  maxDisplayNameLength: 20,
  inputMessageMaxHz: 30,
} as const);

export type GameplayConfig = typeof GAMEPLAY_CONFIG;

export const NETWORK_TICK_MS = 1_000 / GAMEPLAY_CONFIG.networkUpdateHz;
export const SONAR_WEDGE_RADIANS = (GAMEPLAY_CONFIG.sonarWedgeDegrees * Math.PI) / 180;
