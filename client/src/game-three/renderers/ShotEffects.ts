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
import gunshotUrl from '../../assets/audio/gunshot.wav?url';
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
  readonly #audio: HTMLAudioElement | null;
  #lastShotId = '';
  #shownAtMs = 0;
  #hit = false;

  constructor(scene: Scene, audioEnabled: boolean) {
    this.object.name = 'shot-effects';
    this.#line.name = 'shot-tracer';
    this.#muzzle.name = 'muzzle-flash';
    this.#impact.name = 'shot-impact';
    this.#impact.rotation.x = -Math.PI / 2;
    this.object.add(this.#line, this.#muzzle, this.#impact);
    scene.add(this.object);
    this.#audio = audioEnabled && typeof Audio !== 'undefined' ? new Audio(gunshotUrl) : null;
  }

  sync(event: ShotResolutionEvent | null, nowMs: number): void {
    if (!event || event.cancelled) {
      this.#hide();
      return;
    }
    if (event.shotId !== this.#lastShotId) {
      this.#lastShotId = event.shotId;
      this.#shownAtMs = nowMs;
      this.#hit = Boolean(event.targetId);
      this.#setPath(event);
      if (this.#audio) {
        this.#audio.currentTime = 0;
        void this.#audio.play().catch(() => undefined);
      }
    }
    const age = nowMs - this.#shownAtMs;
    if (age > GAMEPLAY_CONFIG.shotResultHoldMs) {
      this.#hide();
      return;
    }
    const alpha = Math.max(0, 1 - age / GAMEPLAY_CONFIG.shotResultHoldMs);
    this.#line.material.opacity = alpha;
    this.#muzzle.material.opacity = alpha;
    this.#muzzle.scale.setScalar(0.8 + alpha * 0.9);
    this.#impact.material.opacity = this.#hit ? alpha : alpha * 0.55;
    this.#impact.scale.setScalar(1.2 + (1 - alpha) * 1.8);
  }

  dispose(): void {
    this.#audio?.pause();
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
