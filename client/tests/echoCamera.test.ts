import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { CameraController } from '../src/game-three/camera/CameraController.js';
import { simulationToWorld } from '../src/game-three/math/coordinates.js';

describe('Echo full-arena camera framing', () => {
  it.each([
    [1920, 1080],
    [1440, 900],
    [1366, 768],
    [900, 700],
  ])('keeps arena corners above the HUD at %sx%s', (width, height) => {
    const camera = new CameraController();
    const hud = 190;
    const header = 115;
    camera.resize(width!, height!, hud, header, true);
    camera.setPresentationKick(3);
    for (const x of [0, 960])
      for (const y of [0, 540]) {
        const world = simulationToWorld({ x, y });
        const point = new Vector3(world.x, world.y, world.z).project(camera.camera);
        expect(Math.abs(point.x)).toBeLessThan(1);
        const screenY = ((1 - point.y) / 2) * height!;
        expect(screenY).toBeGreaterThan(header);
        expect(screenY).toBeLessThan(height! - hud);
      }
  });
  it('gives the board a taller visible aspect without changing its world bounds', () => {
    const camera = new CameraController();
    camera.resize(1366, 768, 136, 115, true);
    const point = (x: number, y: number) => {
      const world = simulationToWorld({ x, y });
      const projected = new Vector3(world.x, world.y, world.z).project(camera.camera);
      return { x: (projected.x * 1366) / 2, y: (projected.y * 768) / 2 };
    };
    const top = point(0, 0);
    const bottom = point(0, 540);
    const right = point(960, 0);
    expect(Math.abs(bottom.y - top.y) / Math.abs(right.x - top.x)).toBeGreaterThan(0.39);
  });

  it('enlarges the arena and fighters proportionally without changing Classic framing', () => {
    const classic = new CameraController();
    const echo = new CameraController();
    classic.resize(1366, 768, 190);
    echo.resize(1366, 768, 145, 120, true);
    expect(echo.camera.right - echo.camera.left).toBeLessThan(
      (classic.camera.right - classic.camera.left) * 0.95,
    );
  });
});
