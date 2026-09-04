import { COMMON_GAMEPLAY_CONFIG, type Vector2 } from '@invisi-fight/shared';

export function distanceToBoundary(origin: Vector2, angle: number): number {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const distances: number[] = [];
  if (dx > 0) distances.push((COMMON_GAMEPLAY_CONFIG.arenaWidth - origin.x) / dx);
  if (dx < 0) distances.push(-origin.x / dx);
  if (dy > 0) distances.push((COMMON_GAMEPLAY_CONFIG.arenaHeight - origin.y) / dy);
  if (dy < 0) distances.push(-origin.y / dy);
  return Math.max(0, Math.min(...distances));
}

export function missDistance(
  origin: Vector2,
  end: Vector2,
  target: Vector2,
  radius: number,
): number {
  const dx = end.x - origin.x;
  const dy = end.y - origin.y;
  const lengthSquared = dx * dx + dy * dy;
  const fraction = lengthSquared
    ? Math.max(
        0,
        Math.min(1, ((target.x - origin.x) * dx + (target.y - origin.y) * dy) / lengthSquared),
      )
    : 0;
  return Math.max(
    0,
    Math.hypot(target.x - origin.x - dx * fraction, target.y - origin.y - dy * fraction) - radius,
  );
}
