import { describe, expect, it } from 'vitest';
import { GAMEPLAY_CONFIG } from '@invisi-fight/shared';
import {
  aimAngleBetweenWorldPoints,
  rayToArenaBoundary,
  simulationToWorld,
  worldToSimulation,
} from '../src/game-three/math/coordinates.js';

describe('Three.js simulation mapping', () => {
  it('centers authoritative 2D coordinates on the Three.js X/Z ground plane', () => {
    expect(simulationToWorld({ x: 0, y: 0 })).toEqual({
      x: -GAMEPLAY_CONFIG.arenaWidth / 2,
      y: 0,
      z: -GAMEPLAY_CONFIG.arenaHeight / 2,
    });
    expect(
      simulationToWorld({
        x: GAMEPLAY_CONFIG.arenaWidth / 2,
        y: GAMEPLAY_CONFIG.arenaHeight / 2,
      }),
    ).toEqual({ x: 0, y: 0, z: 0 });
    expect(worldToSimulation({ x: 120, z: -75 })).toEqual({
      x: GAMEPLAY_CONFIG.arenaWidth / 2 + 120,
      y: GAMEPLAY_CONFIG.arenaHeight / 2 - 75,
    });
  });

  it('uses the server aim convention and clips trajectories to arena bounds', () => {
    expect(aimAngleBetweenWorldPoints({ x: 0, z: 0 }, { x: 0, z: 50 })).toBeCloseTo(Math.PI / 2);
    expect(rayToArenaBoundary({ x: 480, y: 270 }, 0)).toEqual({ x: 960, y: 270 });
    expect(rayToArenaBoundary({ x: 480, y: 270 }, Math.PI / 2)).toEqual({
      x: 480,
      y: 540,
    });
  });
});
