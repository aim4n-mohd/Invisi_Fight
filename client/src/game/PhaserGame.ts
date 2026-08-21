import Phaser from 'phaser';
import { GAMEPLAY_CONFIG } from '@invisi-fight/shared';
import { CLIENT_CONFIG } from '../config/clientConfig.js';
import { ArenaScene } from './scenes/ArenaScene.js';
import { BootScene } from './scenes/BootScene.js';

export class PhaserGame {
  readonly instance: Phaser.Game;

  constructor(parent: HTMLElement) {
    this.instance = new Phaser.Game({
      type: Phaser.AUTO,
      width: GAMEPLAY_CONFIG.arenaWidth,
      height: GAMEPLAY_CONFIG.arenaHeight,
      parent,
      backgroundColor: '#070c16',
      scene: [BootScene, ArenaScene],
      render: { antialias: true, pixelArt: false },
      audio: { noAudio: !CLIENT_CONFIG.audioEnabled },
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    });
  }

  destroy(): void {
    this.instance.destroy(true);
  }
}
