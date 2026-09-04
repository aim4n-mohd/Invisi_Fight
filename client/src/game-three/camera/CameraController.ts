import { OrthographicCamera, Vector3 } from 'three';
import { GAMEPLAY_CONFIG } from '@invisi-fight/shared';

const FRAME_MARGIN = 80;
const MIN_VIEW_HEIGHT = 620;

export class CameraController {
  #kick = 0;
  readonly camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 2_000);

  constructor() {
    this.camera.name = 'tactical-orthographic-camera';
    this.camera.position.set(0, 700, 620);
    this.camera.lookAt(new Vector3(0, 0, 0));
    this.camera.updateMatrixWorld(true);
  }

  resize(width: number, height: number, bottomInset = 0, topInset = 0, fitArena = false): void {
    this.#kick = 0;
    // Echo's steeper angle gives the board more visible height without stretching
    // fighters or changing simulation bounds. Classic keeps its original camera.
    this.camera.position.set(0, fitArena ? 760 : 700, fitArena ? 760 : 620);
    this.camera.lookAt(new Vector3(0, 0, 0));
    this.camera.updateMatrixWorld(true);
    const usableHeight = Math.max(1, height - bottomInset - topInset);
    const aspect = Math.max(1, width) / usableHeight;
    const viewHeight = Math.max(
      fitArena ? 410 : MIN_VIEW_HEIGHT,
      (GAMEPLAY_CONFIG.arenaWidth + (fitArena ? 28 : FRAME_MARGIN)) / aspect,
    );
    const viewWidth = viewHeight * aspect;
    this.camera.left = -viewWidth / 2;
    this.camera.right = viewWidth / 2;
    this.camera.top = viewHeight / 2 + (viewHeight * topInset) / usableHeight;
    this.camera.bottom = -viewHeight / 2 - (viewHeight * bottomInset) / usableHeight;
    this.camera.updateProjectionMatrix();
  }

  setPresentationKick(value: number): void {
    const delta = value - this.#kick;
    if (delta === 0) return;
    this.#kick = value;
    this.camera.top += delta;
    this.camera.bottom += delta;
    this.camera.updateProjectionMatrix();
  }
}
