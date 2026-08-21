import Phaser from 'phaser';
import gunshotUrl from '../../assets/audio/gunshot.wav?url';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload(): void {
    this.load.audio('gunshot', gunshotUrl);
  }

  create(): void {
    this.scene.start('arena');
  }
}
