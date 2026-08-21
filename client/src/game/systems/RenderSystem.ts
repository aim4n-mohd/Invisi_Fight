import type Phaser from 'phaser';
import {
  GAMEPLAY_CONFIG,
  type MatchPhase,
  type PublicPlayerState,
  type Vector2,
} from '@invisi-fight/shared';
import { PHASER_THEME } from '../../ui/theme.js';

export class RenderSystem {
  readonly #graphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.#graphics = scene.add.graphics();
  }

  draw(
    phase: MatchPhase,
    localPosition: Vector2 | null,
    localPlayerId: string | undefined,
    players: readonly PublicPlayerState[],
  ): void {
    this.#graphics.clear();
    if (localPosition && phase === 'planning') {
      this.#graphics.fillStyle(PHASER_THEME.localPlayer, 1);
      this.#graphics.fillCircle(localPosition.x, localPosition.y, GAMEPLAY_CONFIG.playerRadius);
      this.#graphics.lineStyle(2, 0xb9d1ff, 0.9);
      this.#graphics.strokeCircle(
        localPosition.x,
        localPosition.y,
        GAMEPLAY_CONFIG.playerRadius + 4,
      );
    }
    if (phase === 'resolution' || phase === 'results') {
      players.forEach((player) => {
        if (!player.alive || !player.revealedPosition) return;
        const color =
          player.playerId === localPlayerId
            ? PHASER_THEME.localPlayer
            : PHASER_THEME.opponentReveal;
        this.#graphics.fillStyle(color, 1);
        this.#graphics.fillCircle(
          player.revealedPosition.x,
          player.revealedPosition.y,
          GAMEPLAY_CONFIG.playerRadius,
        );
      });
    }
  }
}
