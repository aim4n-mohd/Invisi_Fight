import { GAMEPLAY_CONFIG, type Vector2 } from '@invisi-fight/shared';

export interface WorldGroundPoint {
  x: number;
  z: number;
}

export interface WorldPoint extends WorldGroundPoint {
  y: number;
}

export function simulationToWorld(position: Vector2, height = 0): WorldPoint {
  return {
    x: position.x - GAMEPLAY_CONFIG.arenaWidth / 2,
    y: height,
    z: position.y - GAMEPLAY_CONFIG.arenaHeight / 2,
  };
}

export function worldToSimulation(position: WorldGroundPoint): Vector2 {
  return {
    x: position.x + GAMEPLAY_CONFIG.arenaWidth / 2,
    y: position.z + GAMEPLAY_CONFIG.arenaHeight / 2,
  };
}

export function aimAngleBetweenWorldPoints(
  origin: WorldGroundPoint,
  target: WorldGroundPoint,
): number {
  return Math.atan2(target.z - origin.z, target.x - origin.x);
}

export function rayToArenaBoundary(origin: Vector2, angleRad: number): Vector2 {
  const dx = Math.cos(angleRad);
  const dy = Math.sin(angleRad);
  const candidates: number[] = [];
  if (dx > 0) candidates.push((GAMEPLAY_CONFIG.arenaWidth - origin.x) / dx);
  if (dx < 0) candidates.push((0 - origin.x) / dx);
  if (dy > 0) candidates.push((GAMEPLAY_CONFIG.arenaHeight - origin.y) / dy);
  if (dy < 0) candidates.push((0 - origin.y) / dy);
  const distance = Math.min(...candidates.filter((entry) => entry >= 0));
  return {
    x: Math.max(0, Math.min(GAMEPLAY_CONFIG.arenaWidth, origin.x + dx * distance)),
    y: Math.max(0, Math.min(GAMEPLAY_CONFIG.arenaHeight, origin.y + dy * distance)),
  };
}
