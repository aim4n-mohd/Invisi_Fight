export const GAMEPLAY_CONFIG = Object.freeze({
  protocolVersion: 2,
  minPlayersToStart: 2,
  startingHearts: 2,
  huntDurationMs: 15_000,
  commitDurationMs: 3_000,
  recapDurationMs: 1_500,
  sonarCooldownMs: 3_000,
  sonarPulseRadiusPx: 1_100,
  sonarPulseVisualDurationMs: 500,
  sonarSnapshotDurationMs: 2_000,
  sonarOriginQuantizationPx: 48,
  shotResolutionStepMs: 1_200,
  shotAnticipationMs: 300,
  shotResultHoldMs: 650,
  playerSpeedPxPerSecond: 165,

  networkUpdateHz: 12,
  reconnectGraceMs: 15_000,
  arenaWidth: 960,
  arenaHeight: 540,
  playerRadius: 16,
  shotHitRadiusPx: 22,
  overlapSeparationPx: 12,
  lockedShotRangePx: 5_000,
  roomCodeLength: 6,
  maxDisplayNameLength: 20,
  inputMessageMaxHz: 30,
} as const);

export type GameplayConfig = typeof GAMEPLAY_CONFIG;

export const NETWORK_TICK_MS = 1_000 / GAMEPLAY_CONFIG.networkUpdateHz;
