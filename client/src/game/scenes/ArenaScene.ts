import Phaser from 'phaser';
import { GAMEPLAY_CONFIG, NETWORK_TICK_MS, sonarSweepAngle } from '@invisi-fight/shared';
import { CLIENT_CONFIG } from '../../config/clientConfig.js';
import { PHASER_THEME } from '../../ui/theme.js';
import { roomClient } from '../../network/colyseusClient.js';
import { matchViewStore } from '../../state/matchViewStore.js';
import { privateSnapshotStore } from '../../state/privateSnapshotStore.js';
import { sessionStore } from '../../state/sessionStore.js';
import { AimRenderSystem } from '../systems/AimRenderSystem.js';
import { EffectsSystem } from '../systems/EffectsSystem.js';
import { InterpolationSystem } from '../systems/InterpolationSystem.js';
import { RenderSystem } from '../systems/RenderSystem.js';
import { SonarRenderSystem } from '../systems/SonarRenderSystem.js';

export class ArenaScene extends Phaser.Scene {
  #renderSystem?: RenderSystem;
  #sonarSystem?: SonarRenderSystem;
  #aimSystem?: AimRenderSystem;
  #effectsSystem?: EffectsSystem;
  readonly #interpolation = new InterpolationSystem();
  #keys?: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
  #inputSequence = 0;
  #lastInputAtMs = 0;
  #aimAngleRad = 0;

  constructor() {
    super('arena');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(PHASER_THEME.arenaBackground);
    const graphics = this.add.graphics();
    graphics.lineStyle(1, PHASER_THEME.arenaGrid, 0.55);
    for (let x = 0; x <= GAMEPLAY_CONFIG.arenaWidth; x += 48) {
      graphics.lineBetween(x, 0, x, GAMEPLAY_CONFIG.arenaHeight);
    }
    for (let y = 0; y <= GAMEPLAY_CONFIG.arenaHeight; y += 48) {
      graphics.lineBetween(0, y, GAMEPLAY_CONFIG.arenaWidth, y);
    }
    this.#renderSystem = new RenderSystem(this);
    this.#sonarSystem = new SonarRenderSystem(this);
    this.#aimSystem = new AimRenderSystem(this);
    this.#effectsSystem = new EffectsSystem(this, CLIENT_CONFIG.audioEnabled);
    this.input.once('pointerdown', () => {
      if (this.sound.locked) void this.sound.unlock();
    });
    this.#keys = this.input.keyboard?.addKeys('W,A,S,D') as Record<
      'W' | 'A' | 'S' | 'D',
      Phaser.Input.Keyboard.Key
    >;
  }

  update(_time: number, deltaMs: number): void {
    const match = matchViewStore.getState();
    const privateState = privateSnapshotStore.getState();
    const localPlayerId = sessionStore.getState().roomSession?.playerId;
    if (privateState.playerState) this.#interpolation.setTarget(privateState.playerState.position);
    const localPosition = this.#interpolation.update(deltaMs);
    const pointer = this.input.activePointer;
    if (localPosition) {
      this.#aimAngleRad = Math.atan2(
        pointer.worldY - localPosition.y,
        pointer.worldX - localPosition.x,
      );
    }
    this.#sendInputIfDue(match.phase);
    const nowMs = Date.now();
    this.#renderSystem?.draw(match.phase, localPosition, localPlayerId, match.players);
    this.#aimSystem?.draw(match.phase, localPosition, this.#aimAngleRad, match.players);
    if (match.phase === 'planning') {
      const sweep = sonarSweepAngle(
        nowMs,
        match.phaseStartedAtServerMs,
        GAMEPLAY_CONFIG.sonarRotationPeriodMs,
      );
      this.#sonarSystem?.draw(localPosition, sweep, privateState.detections, nowMs);
    } else {
      this.#sonarSystem?.draw(null, 0, [], nowMs);
    }
    this.#effectsSystem?.draw(match.lastShot, nowMs);
    privateSnapshotStore.getState().prune(nowMs);
  }

  #sendInputIfDue(phase: string): void {
    if (phase !== 'planning' || !this.#keys) return;
    const nowMs = performance.now();
    if (nowMs - this.#lastInputAtMs < NETWORK_TICK_MS) return;
    this.#lastInputAtMs = nowMs;
    const moveX = Number(this.#keys.D.isDown) - Number(this.#keys.A.isDown);
    const moveY = Number(this.#keys.S.isDown) - Number(this.#keys.W.isDown);
    this.#inputSequence += 1;
    roomClient.sendInput({
      moveX,
      moveY,
      aimAngleRad: this.#aimAngleRad,
      sequence: this.#inputSequence,
      clientTimeMs: Date.now(),
    });
  }
}
