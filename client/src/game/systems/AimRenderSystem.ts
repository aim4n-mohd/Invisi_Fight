import type Phaser from 'phaser';
import {
  GAMEPLAY_CONFIG,
  type MatchPhase,
  type PublicPlayerState,
  type Vector2,
} from '@invisi-fight/shared';
import { PHASER_THEME } from '../../ui/theme.js';

export class AimRenderSystem {
  readonly #graphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.#graphics = scene.add.graphics();
  }

  draw(
    phase: MatchPhase,
    localPosition: Vector2 | null,
    localAimAngleRad: number,
    players: readonly PublicPlayerState[],
  ): void {
    this.#graphics.clear();
    this.#graphics.lineStyle(2, PHASER_THEME.shotLine, phase === 'planning' ? 0.65 : 0.4);
    if (phase === 'planning' && localPosition) {
      this.#graphics.lineBetween(
        localPosition.x,
        localPosition.y,
        localPosition.x + Math.cos(localAimAngleRad) * GAMEPLAY_CONFIG.lockedShotRangePx,
        localPosition.y + Math.sin(localAimAngleRad) * GAMEPLAY_CONFIG.lockedShotRangePx,
      );
    }
    if (phase === 'resolution') {
      players.forEach((player) => {
        if (!player.alive || !player.revealedPosition || player.lockedAimAngleRad === null) return;
        this.#graphics.lineBetween(
          player.revealedPosition.x,
          player.revealedPosition.y,
          player.revealedPosition.x +
            Math.cos(player.lockedAimAngleRad) * GAMEPLAY_CONFIG.lockedShotRangePx,
          player.revealedPosition.y +
            Math.sin(player.lockedAimAngleRad) * GAMEPLAY_CONFIG.lockedShotRangePx,
        );
      });
    }
  }
}
