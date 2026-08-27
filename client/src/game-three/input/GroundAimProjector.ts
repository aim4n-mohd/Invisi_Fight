import { Plane, Raycaster, Vector2 as ThreeVector2, Vector3, type Camera } from 'three';
import type { Vector2 } from '@invisi-fight/shared';
import { worldToSimulation } from '../math/coordinates.js';

export interface ViewportRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export class GroundAimProjector {
  readonly #pointer = new ThreeVector2();
  readonly #raycaster = new Raycaster();
  readonly #ground = new Plane(new Vector3(0, 1, 0), 0);
  readonly #hit = new Vector3();

  project(clientX: number, clientY: number, rect: ViewportRect, camera: Camera): Vector2 | null {
    if (rect.width <= 0 || rect.height <= 0) return null;
    this.#pointer.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.#raycaster.setFromCamera(this.#pointer, camera);
    const hit = this.#raycaster.ray.intersectPlane(this.#ground, this.#hit);
    return hit ? worldToSimulation(hit) : null;
  }
}
