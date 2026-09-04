import {
  BufferGeometry,
  DoubleSide,
  Group,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  RingGeometry,
  SphereGeometry,
  Vector3,
  type Scene,
} from 'three';
import { GAMEPLAY_CONFIG, type ShotResolutionEvent } from '@invisi-fight/shared';
import { gameAudio } from '../../audio/GameAudio.js';
import { simulationToWorld } from '../math/coordinates.js';

export class ShotEffects {
  readonly object = new Group();
  readonly #line = new Line(
    new BufferGeometry(),
    new LineBasicMaterial({ color: 0xf5f7fb, transparent: true, opacity: 0 }),
  );
  readonly #muzzle = new Mesh(
    new SphereGeometry(7, 12, 8),
    new MeshBasicMaterial({ color: 0xffea8a, transparent: true, opacity: 0 }),
  );
  readonly #impact = new Mesh(
    new RingGeometry(5, 12, 24),
    new MeshBasicMaterial({
      color: 0xff5c7a,
      transparent: true,
      opacity: 0,
      side: DoubleSide,
    }),
  );
  #lastShotId = '';
  #shownAtMs = 0;
  #hit = false;

  constructor(
    scene: Scene,
    readonly audioEnabled: boolean,
    readonly authoritativeTiming = false,
  ) {
    this.object.name = 'shot-effects';
    this.#line.name = 'shot-tracer';
    this.#muzzle.name = 'muzzle-flash';
    this.#impact.name = 'shot-impact';
    this.#impact.rotation.x = -Math.PI / 2;
    this.object.add(this.#line, this.#muzzle, this.#impact);
    scene.add(this.object);
  }

  sync(
    event: ShotResolutionEvent | null,
    nowMs: number,
    flashAtMs?: number,
    pending = false,
  ): void {
    if (!event || event.cancelled) {
      this.#hide();
      return;
    }
    if (event.shotId !== this.#lastShotId) {
      this.#lastShotId = event.shotId;
      this.#shownAtMs = this.authoritativeTiming ? event.resolvedAtServerMs : nowMs;
      this.#hit = Boolean(event.targetId);
      this.#setPath(event);
      if (this.audioEnabled) gameAudio.play('gunshot');
    }
    const age = nowMs - this.#shownAtMs;
    if (age > GAMEPLAY_CONFIG.shotResultHoldMs) {
      this.#hide();
      return;
    }
    const alpha = Math.max(0, 1 - age / GAMEPLAY_CONFIG.shotResultHoldMs);
    this.#line.material.opacity = alpha;
    const flashAlpha =
      flashAtMs === undefined
        ? alpha
        : Math.max(0, 1 - (nowMs - flashAtMs) / GAMEPLAY_CONFIG.shotResultHoldMs);
    this.#muzzle.material.opacity = flashAlpha;
    this.#muzzle.scale.setScalar(0.8 + flashAlpha * 0.9);
    if (this.authoritativeTiming)
      this.#impact.material.color.setHex(this.#hit ? 0xff5c7a : 0x8ba9bf);
    this.#impact.material.opacity = pending ? 0 : this.#hit ? alpha : alpha * 0.55;
    this.#impact.scale.setScalar(1.2 + (1 - alpha) * 1.8);
  }

  dispose(): void {
    this.#line.geometry.dispose();
    this.#line.material.dispose();
    this.#muzzle.geometry.dispose();
    this.#muzzle.material.dispose();
    this.#impact.geometry.dispose();
    this.#impact.material.dispose();
    this.object.removeFromParent();
  }

  #setPath(event: ShotResolutionEvent): void {
    const origin = simulationToWorld(event.origin, 25);
    const end = simulationToWorld(event.end, event.targetId ? 18 : 2);
    this.#line.geometry.setFromPoints([
      new Vector3(origin.x, origin.y, origin.z),
      new Vector3(end.x, end.y, end.z),
    ]);
    this.#muzzle.position.set(origin.x, origin.y, origin.z);
    this.#impact.position.set(end.x, end.y, end.z);
  }

  #hide(): void {
    this.#line.material.opacity = 0;
    this.#muzzle.material.opacity = 0;
    this.#impact.material.opacity = 0;
  }
}
