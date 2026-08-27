import { describe, expect, it } from 'vitest';
import { OrthographicCamera, Vector3 } from 'three';
import { GroundAimProjector } from '../src/game-three/input/GroundAimProjector.js';

describe('GroundAimProjector', () => {
  it('projects the pointer through an orthographic camera onto the gameplay ground', () => {
    const camera = new OrthographicCamera(-480, 480, 270, -270, 0.1, 2_000);
    camera.position.set(0, 700, 600);
    camera.lookAt(new Vector3(0, 0, 0));
    camera.updateMatrixWorld(true);

    const projector = new GroundAimProjector();
    const hit = projector.project(480, 270, { left: 0, top: 0, width: 960, height: 540 }, camera);

    expect(hit?.x).toBeCloseTo(480, 4);
    expect(hit?.y).toBeCloseTo(270, 4);
  });
});
