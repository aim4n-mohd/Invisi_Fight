import type Phaser from 'phaser';
import {
  GAMEPLAY_CONFIG,
  type PrivateSonarSnapshotEvent,
  type PublicSonarEmissionEvent,
  type Vector2,
} from '@invisi-fight/shared';
import type { LocalSonarPulse } from '../../state/privateSnapshotStore.js';
import { PHASER_THEME } from '../../ui/theme.js';

function clampedProgress(startedAtServerMs: number, expiresAtServerMs: number, nowMs: number) {
  const lifetime = Math.max(1, expiresAtServerMs - startedAtServerMs);
  return Math.max(0, Math.min(1, (nowMs - startedAtServerMs) / lifetime));
}

export function pulseProgress(
  startedAtServerMs: number,
  expiresAtServerMs: number,
  nowMs: number,
): number {
  return clampedProgress(startedAtServerMs, expiresAtServerMs, nowMs);
}

export function snapshotAlpha(
  detectedAtServerMs: number,
  expiresAtServerMs: number,
  nowMs: number,
): number {
  if (nowMs >= expiresAtServerMs) return 0;
  return 1 - clampedProgress(detectedAtServerMs, expiresAtServerMs, nowMs);
}

export class SonarRenderSystem {
  readonly #graphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.#graphics = scene.add.graphics();
  }

  draw(
    localPulse: LocalSonarPulse | null,
    detections: readonly PrivateSonarSnapshotEvent[],
    emissions: readonly PublicSonarEmissionEvent[],
    nowMs: number,
  ): void {
    this.#graphics.clear();
    if (localPulse && localPulse.expiresAtServerMs > nowMs) {
      this.#drawPulse(
        localPulse.origin,
        GAMEPLAY_CONFIG.sonarPulseRadiusPx,
        localPulse.startedAtServerMs,
        localPulse.expiresAtServerMs,
        PHASER_THEME.sonar,
        nowMs,
      );
    }
    emissions.forEach((emission) => {
      if (emission.expiresAtServerMs <= nowMs) return;
      this.#drawPulse(
        emission.approximateOrigin,
        emission.radius,
        emission.emittedAtServerMs,
        emission.expiresAtServerMs,
        PHASER_THEME.sonarRisk,
        nowMs,
      );
    });
    detections.forEach((detection) => {
      const alpha = snapshotAlpha(detection.detectedAtServerMs, detection.expiresAtServerMs, nowMs);
      if (alpha <= 0) return;
      this.#graphics.fillStyle(PHASER_THEME.silhouette, alpha * 0.72);
      this.#graphics.fillCircle(
        detection.position.x,
        detection.position.y,
        GAMEPLAY_CONFIG.playerRadius,
      );
      this.#graphics.lineStyle(2, PHASER_THEME.sonar, alpha);
      this.#graphics.strokeCircle(
        detection.position.x,
        detection.position.y,
        GAMEPLAY_CONFIG.playerRadius + 5,
      );
    });
  }

  #drawPulse(
    origin: Vector2,
    maximumRadius: number,
    startedAtServerMs: number,
    expiresAtServerMs: number,
    color: number,
    nowMs: number,
  ): void {
    const progress = pulseProgress(startedAtServerMs, expiresAtServerMs, nowMs);
    const radius = Math.max(2, maximumRadius * progress);
    const alpha = Math.max(0, 1 - progress);
    this.#graphics.fillStyle(color, alpha * 0.06);
    this.#graphics.fillCircle(origin.x, origin.y, radius);
    this.#graphics.lineStyle(3, color, Math.max(0.15, alpha));
    this.#graphics.strokeCircle(origin.x, origin.y, radius);
  }
}
