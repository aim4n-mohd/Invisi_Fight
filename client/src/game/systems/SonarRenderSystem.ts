import type Phaser from 'phaser';
import {
  GAMEPLAY_CONFIG,
  SONAR_WEDGE_RADIANS,
  isPointInsideWedge,
  type PrivateSonarSnapshotEvent,
  type Vector2,
} from '@invisi-fight/shared';
import { PHASER_THEME } from '../../ui/theme.js';

const SONAR_RADIUS = Math.hypot(GAMEPLAY_CONFIG.arenaWidth, GAMEPLAY_CONFIG.arenaHeight);

export function isDetectionInsideSweep(
  origin: Vector2,
  detectionPosition: Vector2,
  angleRad: number,
): boolean {
  return isPointInsideWedge(origin, detectionPosition, angleRad, SONAR_WEDGE_RADIANS, SONAR_RADIUS);
}

export class SonarRenderSystem {
  readonly #graphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.#graphics = scene.add.graphics();
  }

  draw(
    origin: Vector2 | null,
    angleRad: number,
    detections: readonly PrivateSonarSnapshotEvent[],
    nowMs: number,
  ): void {
    this.#graphics.clear();
    if (!origin) return;
    const radius = SONAR_RADIUS;
    const start = angleRad - SONAR_WEDGE_RADIANS / 2;
    const end = angleRad + SONAR_WEDGE_RADIANS / 2;
    this.#graphics.fillStyle(PHASER_THEME.sonar, 0.12);
    this.#graphics.slice(origin.x, origin.y, radius, start, end, false);
    this.#graphics.fillPath();
    this.#graphics.lineStyle(1, PHASER_THEME.sonar, 0.5);
    this.#graphics.beginPath();
    this.#graphics.moveTo(origin.x, origin.y);
    this.#graphics.lineTo(origin.x + Math.cos(start) * radius, origin.y + Math.sin(start) * radius);
    this.#graphics.moveTo(origin.x, origin.y);
    this.#graphics.lineTo(origin.x + Math.cos(end) * radius, origin.y + Math.sin(end) * radius);
    this.#graphics.strokePath();

    detections.forEach((detection) => {
      if (!isDetectionInsideSweep(origin, detection.position, angleRad)) return;
      const lifetime = Math.max(1, detection.expiresAtServerMs - detection.detectedAtServerMs);
      const alpha = Math.max(0, Math.min(1, (detection.expiresAtServerMs - nowMs) / lifetime));
      if (alpha <= 0) return;
      this.#graphics.fillStyle(PHASER_THEME.silhouette, alpha * 0.65);
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
}
