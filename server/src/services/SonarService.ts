import {
  GAMEPLAY_CONFIG,
  SONAR_WEDGE_RADIANS,
  isPointInsideWedge,
  sonarSweepAngle,
  type Vector2,
} from '@invisi-fight/shared';

export interface SonarPlayer {
  playerId: string;
  position: Vector2;
  alive: boolean;
  spectator: boolean;
}

export interface SonarDetection {
  detectorId: string;
  targetId: string;
  position: Vector2;
  sweepAngleRad: number;
  detectedAtServerMs: number;
  expiresAtServerMs: number;
  cycle: number;
}

export class SonarService {
  readonly #emittedKeys = new Set<string>();

  sample(
    players: readonly SonarPlayer[],
    serverTimeMs: number,
    phaseStartedAtMs: number,
  ): SonarDetection[] {
    const elapsed = Math.max(0, serverTimeMs - phaseStartedAtMs);
    const cycle = Math.floor(elapsed / GAMEPLAY_CONFIG.sonarRotationPeriodMs);
    const angle = sonarSweepAngle(
      serverTimeMs,
      phaseStartedAtMs,
      GAMEPLAY_CONFIG.sonarRotationPeriodMs,
    );
    const radius = Math.hypot(GAMEPLAY_CONFIG.arenaWidth, GAMEPLAY_CONFIG.arenaHeight);
    const detections: SonarDetection[] = [];

    for (const detector of players) {
      if (!detector.alive || detector.spectator) continue;
      for (const target of players) {
        if (!target.alive || target.spectator || detector.playerId === target.playerId) continue;
        const key = `${cycle}:${detector.playerId}:${target.playerId}`;
        if (this.#emittedKeys.has(key)) continue;
        if (
          !isPointInsideWedge(
            detector.position,
            target.position,
            angle,
            SONAR_WEDGE_RADIANS,
            radius,
          )
        ) {
          continue;
        }
        this.#emittedKeys.add(key);
        detections.push({
          detectorId: detector.playerId,
          targetId: target.playerId,
          position: { ...target.position },
          sweepAngleRad: angle,
          detectedAtServerMs: serverTimeMs,
          expiresAtServerMs: serverTimeMs + GAMEPLAY_CONFIG.sonarFadeDurationMs,
          cycle,
        });
      }
    }

    const oldestCycle = cycle - 2;
    for (const key of this.#emittedKeys) {
      if (Number(key.split(':', 1)[0]) < oldestCycle) this.#emittedKeys.delete(key);
    }
    return detections;
  }

  reset(): void {
    this.#emittedKeys.clear();
  }
}
