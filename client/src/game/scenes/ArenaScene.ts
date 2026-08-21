import Phaser from 'phaser';
import { GAMEPLAY_CONFIG, NETWORK_TICK_MS, sonarSweepAngle } from '@invisi-fight/shared';
import { CLIENT_CONFIG } from '../../config/clientConfig.js';
import { PHASER_THEME } from '../../ui/theme.js';
import { roomClient } from '../../network/colyseusClient.js';
import { matchViewStore } from '../../state/matchViewStore.js';
import { privateSnapshotStore } from '../../state/privateSnapshotStore.js';
import { sessionStore } from '../../state/sessionStore.js';
import { serverClock } from '../../network/serverClock.js';
import { KeyboardMovementController } from '../input/KeyboardMovementController.js';
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
  #movement: KeyboardMovementController | null = null;
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
    this.#movement = new KeyboardMovementController();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.#movement?.destroy();
      this.#movement = null;
    });
  }

  update(_time: number, deltaMs: number): void {
    const match = matchViewStore.getState();
    const privateState = privateSnapshotStore.getState();
    const localPlayerId = sessionStore.getState().roomSession?.playerId;
    const localPlayer = match.players.find((player) => player.playerId === localPlayerId);
    const canPlay = Boolean(localPlayer?.alive && localPlayer.role !== 'spectator');
    if (canPlay && privateState.playerState) {
      this.#interpolation.setTarget(privateState.playerState.position);
    }
    const localPosition = canPlay ? this.#interpolation.update(deltaMs) : null;
    const pointer = this.input.activePointer;
    if (localPosition) {
      this.#aimAngleRad = Math.atan2(
        pointer.worldY - localPosition.y,
        pointer.worldX - localPosition.x,
      );
    }
    this.#sendInputIfDue(match.phase, canPlay);
    const nowMs = serverClock.now();
    const gameFrame = this.game.canvas.parentElement;
    if (gameFrame) {
      if (localPosition) gameFrame.dataset.localPlayerX = localPosition.x.toFixed(2);
      else delete gameFrame.dataset.localPlayerX;
    }
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

  #sendInputIfDue(phase: string, canPlay: boolean): void {
    if (phase !== 'planning' || !canPlay || !this.#movement) return;
    const nowMs = performance.now();
    if (nowMs - this.#lastInputAtMs < NETWORK_TICK_MS) return;
    this.#lastInputAtMs = nowMs;
    const movement = this.#movement.movement();
    this.#inputSequence += 1;
    roomClient.sendInput({
      moveX: movement.x,
      moveY: movement.y,
      aimAngleRad: this.#aimAngleRad,
      sequence: this.#inputSequence,
      clientTimeMs: performance.now(),
    });
  }
}
