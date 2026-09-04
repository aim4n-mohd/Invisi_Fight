import Phaser from 'phaser';
import { GAMEPLAY_CONFIG, NETWORK_TICK_MS } from '@invisi-fight/shared';
import { CLIENT_CONFIG } from '../../config/clientConfig.js';
import { SonarPingAudio } from '../../audio/SonarPingAudio.js';
import { gameAudio } from '../../audio/GameAudio.js';
import { PHASER_THEME } from '../../ui/theme.js';
import { roomClient } from '../../network/colyseusClient.js';
import { matchViewStore } from '../../state/matchViewStore.js';
import { privateSnapshotStore } from '../../state/privateSnapshotStore.js';
import { activeOnboardingCue, onboardingStore } from '../../state/onboardingStore.js';
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
  #sonarPing: SonarPingAudio | null = null;
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
    const releaseAudio = gameAudio.enterArena();
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
    this.#sonarPing = new SonarPingAudio(CLIENT_CONFIG.audioEnabled);
    this.#aimSystem = new AimRenderSystem(this);
    this.#effectsSystem = new EffectsSystem(this, CLIENT_CONFIG.audioEnabled);
    this.input.once('pointerdown', () => {
      gameAudio.unlock();
      if (this.sound.locked) void this.sound.unlock();
    });
    this.input.on('pointerdown', this.#onPointerDown);
    this.input.on('pointermove', this.#onPointerMove);
    this.#movement = new KeyboardMovementController(window, () => roomClient.stopInput());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      releaseAudio();
      this.#movement?.destroy();
      this.#movement = null;
      this.#sonarPing?.dispose();
      this.#sonarPing = null;
      this.input.off('pointerdown', this.#onPointerDown);
      this.input.off('pointermove', this.#onPointerMove);
    });
  }

  update(_time: number, deltaMs: number): void {
    const match = matchViewStore.getState();
    const privateState = privateSnapshotStore.getState();
    const onboardingCue = activeOnboardingCue(match.phase, onboardingStore.getState().completed);
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
    if (canPlay && this.#movement?.consumeSonarTrigger() && roomClient.triggerSonar()) {
      onboardingStore.getState().complete('scan');
    }
    this.#sendInputIfDue(match.phase, canPlay);
    const nowMs = serverClock.now();
    const gameFrame = this.game.canvas.parentElement;
    if (gameFrame) {
      gameFrame.dataset.phase = match.phase;
      gameFrame.dataset.privateDetections = String(privateState.detections.length);
      gameFrame.dataset.publicSonarEmissions = String(match.sonarEmissions.length);
      gameFrame.dataset.publicSonarEmissionCount = String(match.sonarEmissionCount);
      if (localPosition) gameFrame.dataset.localPlayerX = localPosition.x.toFixed(2);
      else delete gameFrame.dataset.localPlayerX;
      if (privateState.localSonarPulse) {
        gameFrame.dataset.localSonarPulse = privateState.localSonarPulse.status;
      } else {
        delete gameFrame.dataset.localSonarPulse;
      }
      if (privateState.shotLockStatus?.accepted) {
        gameFrame.dataset.lockSource = privateState.shotLockStatus.lockSource;
      } else {
        delete gameFrame.dataset.lockSource;
      }
    }
    this.#renderSystem?.draw(
      match.phase,
      localPosition,
      localPlayerId,
      match.players,
      match.activeShooterId,
      onboardingCue === 'move',
    );
    this.#aimSystem?.draw(
      match.phase,
      localPosition,
      this.#aimAngleRad,
      match.players,
      privateState.shotLockStatus,
      onboardingCue === 'aim',
    );
    this.#sonarSystem?.draw(
      privateState.localSonarPulse,
      privateState.detections,
      match.sonarEmissions,
      nowMs,
    );
    this.#sonarPing?.sync(privateState.localSonarPulse);
    this.#effectsSystem?.draw(match.lastShot, nowMs);
    privateSnapshotStore.getState().prune(nowMs);
    matchViewStore.getState().pruneSonarEmissions(nowMs);
  }

  #sendInputIfDue(phase: string, canPlay: boolean): void {
    if ((phase !== 'hunt' && phase !== 'commit') || !canPlay || !this.#movement) return;
    const nowMs = performance.now();
    if (nowMs - this.#lastInputAtMs < NETWORK_TICK_MS) return;
    this.#lastInputAtMs = nowMs;
    const movement = phase === 'hunt' ? this.#movement.movement() : { x: 0, y: 0 };
    if (movement.x !== 0 || movement.y !== 0) onboardingStore.getState().complete('move');
    this.#inputSequence += 1;
    roomClient.sendInput({
      moveX: movement.x,
      moveY: movement.y,
      aimAngleRad: this.#aimAngleRad,
      sequence: this.#inputSequence,
      clientTimeMs: performance.now(),
    });
  }

  readonly #onPointerDown = (pointer: Phaser.Input.Pointer): void => {
    if (pointer.button !== 0) return;
    if (roomClient.lockShot(this.#aimAngleRad)) onboardingStore.getState().complete('lock');
  };

  readonly #onPointerMove = (): void => {
    if (matchViewStore.getState().phase === 'commit') onboardingStore.getState().complete('aim');
  };
}
