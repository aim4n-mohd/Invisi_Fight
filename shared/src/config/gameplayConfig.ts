export const COMMON_GAMEPLAY_CONFIG = Object.freeze({
  protocolVersion: 5,
  minPlayersToStart: 2,
  maxActiveFighters: 4,
  networkUpdateHz: 12,
  reconnectGraceMs: 15_000,
  arenaWidth: 960,
  arenaHeight: 540,
  lockedShotRangePx: 5_000,
  roomCodeLength: 6,
  maxDisplayNameLength: 20,
  inputMessageMaxHz: 30,
});

export const CLASSIC_GAMEPLAY_CONFIG = Object.freeze({
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

  playerRadius: 16,
  shotHitRadiusPx: 22,
  overlapSeparationPx: 12,
});

export const ECHO_GAMEPLAY_CONFIG = Object.freeze({
  startingHearts: 3,
  walkSpeedPxPerSecond: 165,
  runSpeedPxPerSecond: 235,
  playerRadius: 19,
  shotHitRadiusPx: 26,
  fighterVisualScale: 1.18,
  fireCooldownMs: 650,
  magazineSize: 3,
  reloadDurationMs: 1_800,
  reloadStartDelayMs: 300,
  countdownDurationMs: 5_000,
  huntDurationMs: 75_000,
  finalEchoIntervalMs: 2_500,
  sonarCooldownMs: 10_000,
  sonarPulseRadiusPx: 1_100,
  sonarPulseVisualDurationMs: 500,
  sonarSnapshotDurationMs: 2_000,
  sonarOriginQuantizationPx: 48,
  walkCueCadenceMs: 680,
  walkVarianceRadiusPx: 60,
  walkIntensity: 0.25,
  walkCueLifetimeMs: 900,
  runCueCadenceMs: 340,
  runVarianceRadiusPx: 36,
  runIntensity: 0.55,
  runCueLifetimeMs: 700,
  sonarIntensity: 0.85,
  gunshotIntensity: 1,
  finalEchoIntensity: 0.9,
  finalEchoVarianceRadiusPx: 30,
  finalEchoCueLifetimeMs: 1_000,
  decoyDurationMs: 1_300,
  decoyStepCount: 4,
  decoyTravelPx: 150,
  resultsImpactHoldMs: 650,
  eventQueueLimit: 96,
  soundMeterDecayMs: 1_600,
  shotEffectLifetimeMs: 650,
  cameraKickDurationMs: 100,
  cameraKickWorldUnits: 3,
  hitStopDurationMs: 45,
  landingKeepaliveMs: 8 * 60_000,
});

// Compatibility surface for the preserved Classic implementation. New code should
// select COMMON/CLASSIC/ECHO explicitly at a mode boundary.
export const GAMEPLAY_CONFIG = Object.freeze({
  ...COMMON_GAMEPLAY_CONFIG,
  ...CLASSIC_GAMEPLAY_CONFIG,
});

export type GameplayConfig = typeof GAMEPLAY_CONFIG;

export const NETWORK_TICK_MS = 1_000 / COMMON_GAMEPLAY_CONFIG.networkUpdateHz;
