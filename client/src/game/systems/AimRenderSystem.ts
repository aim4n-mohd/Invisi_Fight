import type Phaser from 'phaser';
import {
  GAMEPLAY_CONFIG,
  type MatchPhase,
  type PublicPlayerState,
  type ShotLockStatusEvent,
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
    shotLockStatus: ShotLockStatusEvent | null,
    cueAim = false,
  ): void {
    this.#graphics.clear();
    const canAim = phase === 'hunt' || phase === 'commit';
    this.#graphics.lineStyle(
      cueAim ? 4 : 2,
      cueAim ? PHASER_THEME.onboardingCue : PHASER_THEME.shotLine,
      cueAim ? 0.95 : phase === 'hunt' ? 0.65 : 0.45,
    );
    if (canAim && localPosition) {
      this.#graphics.lineBetween(
        localPosition.x,
        localPosition.y,
        localPosition.x + Math.cos(localAimAngleRad) * GAMEPLAY_CONFIG.lockedShotRangePx,
        localPosition.y + Math.sin(localAimAngleRad) * GAMEPLAY_CONFIG.lockedShotRangePx,
      );
    }
    if (phase === 'commit' && localPosition && shotLockStatus?.accepted) {
      this.#graphics.lineStyle(4, PHASER_THEME.lockedAim, 0.95);
      this.#graphics.lineBetween(
        localPosition.x,
        localPosition.y,
        localPosition.x +
          Math.cos(shotLockStatus.lockedAimAngleRad) * GAMEPLAY_CONFIG.lockedShotRangePx,
        localPosition.y +
          Math.sin(shotLockStatus.lockedAimAngleRad) * GAMEPLAY_CONFIG.lockedShotRangePx,
      );
    }
    if (phase === 'resolution' || phase === 'recap') {
      players.forEach((player) => {
        if (!player.revealedPosition || player.lockedAimAngleRad === null) return;
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
