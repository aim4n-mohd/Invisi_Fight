import { GAMEPLAY_CONFIG, type MatchPhase, type Vector2 } from '@invisi-fight/shared';

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
  detectedAtServerMs: number;
  expiresAtServerMs: number;
}

export type SonarRejectionReason = 'cooldown' | 'wrong_phase' | 'not_active';

export interface AcceptedSonarActivation {
  accepted: true;
  detectorId: string;
  activatedAtServerMs: number;
  readyAtServerMs: number;
  approximateOrigin: Vector2;
  detections: SonarDetection[];
}

export interface RejectedSonarActivation {
  accepted: false;
  reason: SonarRejectionReason;
  readyAtServerMs: number;
}

export type SonarActivation = AcceptedSonarActivation | RejectedSonarActivation;

export interface SonarPolicy {
  allowedPhases: readonly MatchPhase[];
  cooldownMs: number;
  radiusPx: number;
  snapshotDurationMs?: number;
  originQuantizationPx?: number;
}

function quantize(value: number, maximum: number, step: number): number {
  return Math.min(maximum, Math.max(0, Math.round(value / step) * step));
}

export class SonarService {
  readonly #readyAtByPlayer = new Map<string, number>();

  activate(
    players: readonly SonarPlayer[],
    detectorId: string,
    phase: MatchPhase,
    serverTimeMs: number,
    policy?: SonarPolicy,
  ): SonarActivation {
    const currentReadyAt = this.readyAt(detectorId);
    if (!(policy?.allowedPhases ?? ['hunt']).includes(phase)) {
      return {
        accepted: false,
        reason: 'wrong_phase',
        readyAtServerMs: Math.max(serverTimeMs, currentReadyAt),
      };
    }

    const detector = players.find((player) => player.playerId === detectorId);
    if (!detector?.alive || detector.spectator) {
      return {
        accepted: false,
        reason: 'not_active',
        readyAtServerMs: Math.max(serverTimeMs, currentReadyAt),
      };
    }
    if (serverTimeMs < currentReadyAt) {
      return { accepted: false, reason: 'cooldown', readyAtServerMs: currentReadyAt };
    }

    const readyAtServerMs = serverTimeMs + (policy?.cooldownMs ?? GAMEPLAY_CONFIG.sonarCooldownMs);
    this.#readyAtByPlayer.set(detectorId, readyAtServerMs);
    const radiusSquared = (policy?.radiusPx ?? GAMEPLAY_CONFIG.sonarPulseRadiusPx) ** 2;
    const detections = players.flatMap<SonarDetection>((target) => {
      if (!target.alive || target.spectator || target.playerId === detectorId) return [];
      const dx = target.position.x - detector.position.x;
      const dy = target.position.y - detector.position.y;
      if (dx * dx + dy * dy > radiusSquared) return [];
      return [
        {
          detectorId,
          targetId: target.playerId,
          position: { ...target.position },
          detectedAtServerMs: serverTimeMs,
          expiresAtServerMs:
            serverTimeMs + (policy?.snapshotDurationMs ?? GAMEPLAY_CONFIG.sonarSnapshotDurationMs),
        },
      ];
    });

    return {
      accepted: true,
      detectorId,
      activatedAtServerMs: serverTimeMs,
      readyAtServerMs,
      approximateOrigin: {
        x: quantize(
          detector.position.x,
          GAMEPLAY_CONFIG.arenaWidth,
          policy?.originQuantizationPx ?? GAMEPLAY_CONFIG.sonarOriginQuantizationPx,
        ),
        y: quantize(
          detector.position.y,
          GAMEPLAY_CONFIG.arenaHeight,
          policy?.originQuantizationPx ?? GAMEPLAY_CONFIG.sonarOriginQuantizationPx,
        ),
      },
      detections,
    };
  }

  readyAt(playerId: string): number {
    return this.#readyAtByPlayer.get(playerId) ?? 0;
  }

  remove(playerId: string): void {
    this.#readyAtByPlayer.delete(playerId);
  }

  reset(): void {
    this.#readyAtByPlayer.clear();
  }
}
