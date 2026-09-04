import {
  ACESFilmicToneMapping,
  Color,
  DirectionalLight,
  HemisphereLight,
  PCFSoftShadowMap,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';
import {
  ECHO_GAMEPLAY_CONFIG,
  GAMEPLAY_CONFIG,
  NETWORK_TICK_MS,
  type MatchPhase,
} from '@invisi-fight/shared';
import { CLIENT_CONFIG } from '../config/clientConfig.js';
import { SonarPingAudio } from '../audio/SonarPingAudio.js';
import {
  gameplayInputBlocked,
  KeyboardMovementController,
} from '../game/input/KeyboardMovementController.js';
import { echoStore } from '../state/echoStore.js';
import { gameAudio } from '../audio/GameAudio.js';
import { EchoEffects } from './renderers/EchoEffects.js';
import { InterpolationSystem } from '../game/systems/InterpolationSystem.js';
import { roomClient } from '../network/colyseusClient.js';
import { serverClock } from '../network/serverClock.js';
import { matchViewStore } from '../state/matchViewStore.js';
import { onboardingStore } from '../state/onboardingStore.js';
import { privateSnapshotStore } from '../state/privateSnapshotStore.js';
import { sessionStore } from '../state/sessionStore.js';
import { CameraController } from './camera/CameraController.js';
import { GroundAimProjector } from './input/GroundAimProjector.js';
import { ArenaRenderer } from './renderers/ArenaRenderer.js';
import { AimRenderer } from './renderers/AimRenderer.js';
import { FighterRenderer } from './renderers/FighterRenderer.js';
import { selectVisibleFighters } from './renderers/fighterVisibility.js';
import { ShotEffects } from './renderers/ShotEffects.js';
import { SonarRenderer } from './renderers/SonarRenderer.js';

export function shouldResetEchoInput(
  previousRound: number,
  roundNumber: number,
  phase: MatchPhase,
): boolean {
  return previousRound !== roundNumber || phase === 'results';
}

export class ThreeGame {
  readonly #parent: HTMLElement;
  readonly #scene = new Scene();
  readonly #renderer: WebGLRenderer;
  readonly #cameraController = new CameraController();
  readonly #arena = new ArenaRenderer();
  readonly #fighters: FighterRenderer;
  readonly #sonar: SonarRenderer;
  readonly #sonarPing = new SonarPingAudio(CLIENT_CONFIG.audioEnabled);
  readonly #aim: AimRenderer;
  readonly #shots: ShotEffects;
  readonly #movement = new KeyboardMovementController(window, () => roomClient.stopInput());
  readonly #echoEffects: EchoEffects;
  readonly #releaseAudio: () => void;
  #roundNumber = -1;
  #lastPhase = '';
  #lastHitShotId = '';
  #hitStopUntil = 0;
  #visualSeconds = 0;
  readonly #interpolation = new InterpolationSystem();
  readonly #aimProjector = new GroundAimProjector();
  readonly #resizeObserver: ResizeObserver;
  #pointer: { x: number; y: number } | null = null;
  #localAimAngleRad = 0;
  #localPosition: { x: number; y: number } | null = null;
  #lastFrameAtMs = performance.now();
  #lastInputAtMs = 0;
  #inputSequence = 0;
  #frameCount = 0;
  #frameTimeTotalMs = 0;
  #frameTimeMaximumMs = 0;
  #frameTimeSamples = 0;
  #destroyed = false;

  constructor(parent: HTMLElement) {
    this.#parent = parent;
    this.#scene.background = new Color(0x050912);
    this.#renderer = new WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.#renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.#renderer.shadowMap.enabled = true;
    this.#renderer.shadowMap.type = PCFSoftShadowMap;
    this.#renderer.outputColorSpace = SRGBColorSpace;
    this.#renderer.toneMapping = ACESFilmicToneMapping;
    this.#renderer.toneMappingExposure = 1.12;
    this.#renderer.domElement.setAttribute('aria-label', '2.5D tactical arena');
    parent.replaceChildren(this.#renderer.domElement);
    parent.dataset.renderer = 'three';
    parent.dataset.cameraMode = 'orthographic';
    parent.dataset.contextState = 'ready';

    this.#scene.add(this.#arena.object);
    this.#fighters = new FighterRenderer(this.#scene);
    this.#sonar = new SonarRenderer(this.#scene);
    this.#aim = new AimRenderer(this.#scene);
    this.#shots = new ShotEffects(this.#scene, CLIENT_CONFIG.audioEnabled);
    this.#echoEffects = new EchoEffects(this.#scene);
    this.#releaseAudio = gameAudio.enterArena();
    this.#addLighting();

    this.#renderer.domElement.addEventListener('pointermove', this.#onPointerMove);
    this.#renderer.domElement.addEventListener('pointerdown', this.#onPointerDown);
    this.#renderer.domElement.addEventListener('contextmenu', this.#onContextMenu);
    this.#renderer.domElement.addEventListener('webglcontextlost', this.#onContextLost);
    this.#renderer.domElement.addEventListener('webglcontextrestored', this.#onContextRestored);
    this.#resizeObserver = new ResizeObserver(() => this.#resize());
    this.#resizeObserver.observe(parent);
    const overlay = parent.parentElement?.querySelector<HTMLElement>('.echo-hud');
    if (overlay) this.#resizeObserver.observe(overlay);
    const header = parent.parentElement?.querySelector<HTMLElement>('.echo-topbar');
    if (header) this.#resizeObserver.observe(header);
    this.#resize();
    this.#renderer.setAnimationLoop(this.#frame);
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#renderer.setAnimationLoop(null);
    this.#resizeObserver.disconnect();
    this.#renderer.domElement.removeEventListener('pointermove', this.#onPointerMove);
    this.#renderer.domElement.removeEventListener('pointerdown', this.#onPointerDown);
    this.#renderer.domElement.removeEventListener('contextmenu', this.#onContextMenu);
    this.#renderer.domElement.removeEventListener('webglcontextlost', this.#onContextLost);
    this.#renderer.domElement.removeEventListener('webglcontextrestored', this.#onContextRestored);
    this.#movement.destroy();
    this.#arena.dispose();
    this.#fighters.dispose();
    this.#sonar.dispose();
    this.#sonarPing.dispose();
    this.#aim.dispose();
    this.#shots.dispose();
    this.#echoEffects.clear();
    this.#releaseAudio();
    this.#renderer.dispose();
    this.#renderer.forceContextLoss();
    this.#renderer.domElement.remove();
  }

  readonly #frame = (timeMs: number): void => {
    if (this.#destroyed) return;
    const deltaMs = Math.min(100, Math.max(0, timeMs - this.#lastFrameAtMs));
    this.#lastFrameAtMs = timeMs;
    const match = matchViewStore.getState();
    const echo = match.mode === 'echo_hunt';
    if (echo && (this.#roundNumber !== match.roundNumber || this.#lastPhase !== match.phase)) {
      if (shouldResetEchoInput(this.#roundNumber, match.roundNumber, match.phase))
        this.#movement.reset();
      if (this.#roundNumber !== match.roundNumber) this.#interpolation.reset();
      this.#roundNumber = match.roundNumber;
      this.#lastPhase = match.phase;
      this.#hitStopUntil = 0;
    }
    const privateState = privateSnapshotStore.getState();
    const localPlayerId = sessionStore.getState().roomSession?.playerId;
    const localPlayer = match.players.find((player) => player.playerId === localPlayerId);
    const canPlay = Boolean(localPlayer?.alive && localPlayer.role !== 'spectator');

    if (canPlay && privateState.playerState) {
      this.#interpolation.setTarget(privateState.playerState.position);
      this.#localPosition = this.#interpolation.update(
        echo && serverClock.now() < this.#hitStopUntil ? 0 : deltaMs,
      );
      if (!this.#pointer) this.#localAimAngleRad = privateState.playerState.aimAngleRad;
    } else {
      this.#localPosition = null;
    }
    this.#updatePointerAim();

    if (canPlay && this.#movement.consumeSonarTrigger() && roomClient.triggerSonar()) {
      onboardingStore.getState().complete('scan');
    }
    this.#sendInputIfDue(match.phase, canPlay);

    const nowMs = serverClock.now();
    privateSnapshotStore.getState().prune(nowMs);
    matchViewStore.getState().pruneSonarEmissions(nowMs);
    const movement = privateState.playerState?.velocity;
    const localMoving = Boolean(
      (echo || match.phase === 'hunt') && movement && Math.hypot(movement.x, movement.y) > 1,
    );
    const visibleFighters = selectVisibleFighters({
      mode: match.mode,
      phase: match.phase,
      localPlayerId,
      localPosition: this.#localPosition,
      localAimAngleRad: this.#localAimAngleRad,
      localMoving,
      activeShooterId: match.activeShooterId,
      hitPlayerId:
        match.lastShot?.targetId &&
        nowMs - match.lastShot.resolvedAtServerMs <= GAMEPLAY_CONFIG.shotResultHoldMs
          ? match.lastShot.targetId
          : null,
      players: match.players,
    });
    this.#arena.setPhase(match.phase);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (echo && !reduced) {
      const hit = [...match.shotEvents]
        .reverse()
        .find(
          (shot) =>
            shot.targetId &&
            nowMs - shot.resolvedAtServerMs < ECHO_GAMEPLAY_CONFIG.shotEffectLifetimeMs,
        );
      if (hit && hit.shotId !== this.#lastHitShotId) {
        this.#lastHitShotId = hit.shotId;
        this.#hitStopUntil = nowMs + ECHO_GAMEPLAY_CONFIG.hitStopDurationMs;
      }
      if (nowMs >= this.#hitStopUntil) this.#visualSeconds += deltaMs / 1_000;
      const prediction = echoStore.getState().predictions.at(-1);
      const kickAge = prediction ? nowMs - prediction.createdAtServerMs : Infinity;
      this.#cameraController.setPresentationKick(
        ECHO_GAMEPLAY_CONFIG.cameraKickWorldUnits *
          Math.max(0, 1 - kickAge / ECHO_GAMEPLAY_CONFIG.cameraKickDurationMs),
      );
    } else this.#cameraController.setPresentationKick(0);
    this.#fighters.sync(
      visibleFighters,
      echo ? (reduced ? 0 : this.#visualSeconds) : timeMs / 1_000,
      echo ? ECHO_GAMEPLAY_CONFIG.fighterVisualScale : 1,
    );
    this.#sonar.sync(
      echo && !canPlay ? null : privateState.localSonarPulse,
      echo && !canPlay ? [] : privateState.detections,
      match.sonarEmissions,
      nowMs,
      {
        fighterScale: echo ? ECHO_GAMEPLAY_CONFIG.fighterVisualScale : 1,
        reducedMotion: echo && reduced,
      },
    );
    if (!echo) this.#sonarPing.sync(privateState.localSonarPulse);
    this.#aim.sync(
      echo && ['lobby', 'countdown', 'echo_hunt', 'final_echo'].includes(match.phase)
        ? 'hunt'
        : match.phase,
      this.#localPosition,
      this.#localAimAngleRad,
      match.players,
      privateState.shotLockStatus,
      match.activeShooterId,
    );
    if (echo) {
      matchViewStore.getState().pruneEvents(nowMs);
      echoStore.getState().prune(nowMs);
      this.#echoEffects.sync(nowMs);
    } else this.#shots.sync(match.lastShot, nowMs);
    this.#syncDiagnostics(match.phase, privateState);
    this.#renderer.render(this.#scene, this.#cameraController.camera);
    this.#parent.dataset.threeDrawCalls = String(this.#renderer.info.render.calls);
    if (this.#frameCount === 30) this.#sampleRenderedPixels();
    this.#frameCount += 1;
    this.#parent.dataset.threeFrameCount = String(this.#frameCount);
    this.#recordFrameTime(deltaMs);
  };

  #sendInputIfDue(phase: string, canPlay: boolean): void {
    const echo = matchViewStore.getState().mode === 'echo_hunt';
    if (
      !(echo
        ? ['lobby', 'countdown', 'echo_hunt', 'final_echo'].includes(phase)
        : ['hunt', 'commit'].includes(phase)) ||
      !canPlay
    )
      return;
    const nowMs = performance.now();
    if (nowMs - this.#lastInputAtMs < NETWORK_TICK_MS) return;
    this.#lastInputAtMs = nowMs;
    const movement =
      !gameplayInputBlocked() && (echo || phase === 'hunt')
        ? this.#movement.movement()
        : { x: 0, y: 0 };
    if (movement.x !== 0 || movement.y !== 0) onboardingStore.getState().complete('move');
    this.#inputSequence += 1;
    roomClient.sendInput({
      moveX: movement.x,
      moveY: movement.y,
      running: echo && this.#movement.running(),
      aimAngleRad: this.#localAimAngleRad,
      sequence: this.#inputSequence,
      clientTimeMs: performance.now(),
    });
  }

  #updatePointerAim(): void {
    if (!this.#pointer || !this.#localPosition) return;
    const target = this.#aimProjector.project(
      this.#pointer.x,
      this.#pointer.y,
      this.#renderer.domElement.getBoundingClientRect(),
      this.#cameraController.camera,
    );
    if (!target) return;
    this.#localAimAngleRad = Math.atan2(
      target.y - this.#localPosition.y,
      target.x - this.#localPosition.x,
    );
  }

  #syncDiagnostics(
    phase: string,
    privateState: ReturnType<typeof privateSnapshotStore.getState>,
  ): void {
    const match = matchViewStore.getState();
    this.#parent.dataset.phase = phase;
    this.#parent.dataset.privateDetections = String(privateState.detections.length);
    this.#parent.dataset.publicSonarEmissions = String(match.sonarEmissions.length);
    this.#parent.dataset.publicSonarEmissionCount = String(match.sonarEmissionCount);
    this.#parent.dataset.localGunAngle = this.#localAimAngleRad.toFixed(4);
    if (match.activeShooterId) this.#parent.dataset.activeShooterSeen = 'true';
    if (this.#localPosition) this.#parent.dataset.localPlayerX = this.#localPosition.x.toFixed(2);
    else delete this.#parent.dataset.localPlayerX;
    if (privateState.localSonarPulse) {
      this.#parent.dataset.localSonarPulse = privateState.localSonarPulse.status;
    } else {
      delete this.#parent.dataset.localSonarPulse;
    }
    if (privateState.shotLockStatus?.accepted) {
      this.#parent.dataset.lockSource = privateState.shotLockStatus.lockSource;
    } else {
      delete this.#parent.dataset.lockSource;
    }
  }

  #resize(): void {
    const width = Math.max(1, this.#parent.clientWidth);
    const height = Math.max(1, this.#parent.clientHeight);
    this.#renderer.setSize(width, height, false);
    const overlay = this.#parent.parentElement?.querySelector<HTMLElement>('.echo-hud');
    const header = this.#parent.parentElement?.querySelector<HTMLElement>('.echo-topbar');
    this.#cameraController.resize(
      width,
      height,
      overlay?.getBoundingClientRect().height ?? 0,
      header?.getBoundingClientRect().height ?? 0,
      Boolean(overlay),
    );
  }

  #addLighting(): void {
    this.#scene.add(new HemisphereLight(0x9fc6ff, 0x07101e, 1.7));
    const key = new DirectionalLight(0xfff1d2, 3.4);
    key.position.set(-260, 620, 360);
    key.castShadow = true;
    key.shadow.mapSize.set(1_024, 1_024);
    key.shadow.camera.left = -560;
    key.shadow.camera.right = 560;
    key.shadow.camera.top = 360;
    key.shadow.camera.bottom = -360;
    key.shadow.camera.near = 100;
    key.shadow.camera.far = 1_200;
    this.#scene.add(key, key.target);
  }

  #sampleRenderedPixels(): void {
    const context = this.#renderer.getContext();
    const pixel = new Uint8Array(4);
    let nonBackgroundSamples = 0;
    for (let column = 1; column <= 8; column += 1) {
      for (let row = 1; row <= 5; row += 1) {
        context.readPixels(
          Math.floor((context.drawingBufferWidth * column) / 9),
          Math.floor((context.drawingBufferHeight * row) / 6),
          1,
          1,
          context.RGBA,
          context.UNSIGNED_BYTE,
          pixel,
        );
        const brightness = (pixel[0] ?? 0) + (pixel[1] ?? 0) + (pixel[2] ?? 0);
        if (brightness > 45) nonBackgroundSamples += 1;
      }
    }
    this.#parent.dataset.threeNonblankSamples = String(nonBackgroundSamples);
  }

  #recordFrameTime(deltaMs: number): void {
    if (this.#frameCount <= 30 || this.#frameTimeSamples >= 180) return;
    this.#frameTimeTotalMs += deltaMs;
    this.#frameTimeMaximumMs = Math.max(this.#frameTimeMaximumMs, deltaMs);
    this.#frameTimeSamples += 1;
    this.#parent.dataset.threeAverageFrameMs = (
      this.#frameTimeTotalMs / this.#frameTimeSamples
    ).toFixed(2);
    this.#parent.dataset.threeMaximumFrameMs = this.#frameTimeMaximumMs.toFixed(2);
  }

  readonly #onPointerMove = (event: PointerEvent): void => {
    this.#pointer = { x: event.clientX, y: event.clientY };
    if (matchViewStore.getState().phase === 'commit') onboardingStore.getState().complete('aim');
  };

  readonly #onPointerDown = (event: PointerEvent): void => {
    if (document.querySelector('[aria-modal="true"]')) return;
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    gameAudio.unlock();
    const echo = matchViewStore.getState().mode === 'echo_hunt';
    if (event.button !== 0 && !(echo && event.button === 2)) return;
    this.#pointer = { x: event.clientX, y: event.clientY };
    this.#updatePointerAim();
    if (echo) {
      if (event.button === 2) roomClient.sendDecoy(this.#localAimAngleRad);
      else roomClient.sendFire(this.#localAimAngleRad);
    } else if (roomClient.lockShot(this.#localAimAngleRad))
      onboardingStore.getState().complete('lock');
  };

  readonly #onContextMenu = (event: Event): void => {
    if (matchViewStore.getState().mode === 'echo_hunt') event.preventDefault();
  };

  readonly #onContextLost = (event: Event): void => {
    event.preventDefault();
    this.#parent.dataset.contextState = 'lost';
  };

  readonly #onContextRestored = (): void => {
    this.#parent.dataset.contextState = 'ready';
  };
}
