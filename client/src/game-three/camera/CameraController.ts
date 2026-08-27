import { OrthographicCamera, Vector3 } from 'three';
import { GAMEPLAY_CONFIG } from '@invisi-fight/shared';

const FRAME_MARGIN = 80;
const MIN_VIEW_HEIGHT = 620;

export class CameraController {
  readonly camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 2_000);

  constructor() {
    this.camera.name = 'tactical-orthographic-camera';
    this.camera.position.set(0, 700, 620);
    this.camera.lookAt(new Vector3(0, 0, 0));
    this.camera.updateMatrixWorld(true);
  }

  resize(width: number, height: number): void {
    const aspect = Math.max(1, width) / Math.max(1, height);
    const viewHeight = Math.max(
      MIN_VIEW_HEIGHT,
      (GAMEPLAY_CONFIG.arenaWidth + FRAME_MARGIN) / aspect,
    );
    const viewWidth = viewHeight * aspect;
    this.camera.left = -viewWidth / 2;
    this.camera.right = viewWidth / 2;
    this.camera.top = viewHeight / 2;
    this.camera.bottom = -viewHeight / 2;
    this.camera.updateProjectionMatrix();
  }
}
