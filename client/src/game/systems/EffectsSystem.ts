import type Phaser from 'phaser';
import { GAMEPLAY_CONFIG, type ShotResolutionEvent } from '@invisi-fight/shared';
import { PHASER_THEME } from '../../ui/theme.js';
import { gameAudio } from '../../audio/GameAudio.js';

export class EffectsSystem {
  readonly #graphics: Phaser.GameObjects.Graphics;
  readonly #audioEnabled: boolean;
  #lastShotId = '';
  #shownAtMs = 0;

  constructor(scene: Phaser.Scene, audioEnabled: boolean) {
    this.#audioEnabled = audioEnabled;
    this.#graphics = scene.add.graphics();
  }

  draw(event: ShotResolutionEvent | null, nowMs: number): void {
    this.#graphics.clear();
    if (!event || event.cancelled) return;
    if (event.shotId !== this.#lastShotId) {
      this.#lastShotId = event.shotId;
      this.#shownAtMs = nowMs;
      if (this.#audioEnabled) gameAudio.play('gunshot', 0.68);
    }
    const age = nowMs - this.#shownAtMs;
    if (age > GAMEPLAY_CONFIG.shotResultHoldMs) return;
    const alpha = 1 - age / GAMEPLAY_CONFIG.shotResultHoldMs;
    this.#graphics.lineStyle(4, PHASER_THEME.shotLine, alpha);
    this.#graphics.lineBetween(event.origin.x, event.origin.y, event.end.x, event.end.y);
    this.#graphics.fillStyle(0xffea8a, alpha);
    this.#graphics.fillCircle(event.origin.x, event.origin.y, 10 + alpha * 8);
    if (event.targetId) {
      this.#graphics.fillStyle(PHASER_THEME.impact, alpha);
      this.#graphics.fillCircle(event.end.x, event.end.y, 12 + alpha * 10);
    }
  }
}
