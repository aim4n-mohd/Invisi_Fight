import type { Vector2 } from '../types/match.js';

const TAU = Math.PI * 2;

export function normalizeAngle(angleRad: number): number {
  let normalized = angleRad % TAU;
  if (normalized >= Math.PI) normalized -= TAU;
  if (normalized < -Math.PI) normalized += TAU;
  return normalized;
}

export function angleDelta(fromRad: number, toRad: number): number {
  return normalizeAngle(toRad - fromRad);
}

export function sonarSweepAngle(
  serverTimeMs: number,
  phaseStartedAtMs: number,
  periodMs: number,
): number {
  const elapsed = Math.max(0, serverTimeMs - phaseStartedAtMs);
  return normalizeAngle((elapsed / periodMs) * TAU);
}

export function isPointInsideWedge(
  origin: Vector2,
  target: Vector2,
  centerAngleRad: number,
  wedgeWidthRad: number,
  radius: number,
): boolean {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const distanceSquared = dx * dx + dy * dy;
  if (distanceSquared === 0 || distanceSquared > radius * radius) return false;
  const targetAngle = Math.atan2(dy, dx);
  return Math.abs(angleDelta(centerAngleRad, targetAngle)) <= wedgeWidthRad / 2;
}

export interface RayCircleCandidate {
  id: string;
  center: Vector2;
  radius: number;
  alive: boolean;
}

export interface RayHit {
  id: string;
  distance: number;
  point: Vector2;
}

export function rayCircleDistance(
  origin: Vector2,
  direction: Vector2,
  center: Vector2,
  radius: number,
): number | null {
  const magnitude = Math.hypot(direction.x, direction.y);
  if (magnitude === 0) return null;
  const dx = direction.x / magnitude;
  const dy = direction.y / magnitude;
  const ox = origin.x - center.x;
  const oy = origin.y - center.y;
  const b = 2 * (dx * ox + dy * oy);
  const c = ox * ox + oy * oy - radius * radius;
  const discriminant = b * b - 4 * c;
  if (discriminant < 0) return null;
  const root = Math.sqrt(discriminant);
  const near = (-b - root) / 2;
  const far = (-b + root) / 2;
  if (near >= 0) return near;
  if (far >= 0) return far;
  return null;
}

export function firstRayHit(
  origin: Vector2,
  angleRad: number,
  candidates: readonly RayCircleCandidate[],
  excludedId: string,
): RayHit | null {
  const direction = { x: Math.cos(angleRad), y: Math.sin(angleRad) };
  const hits = candidates
    .filter((candidate) => candidate.alive && candidate.id !== excludedId)
    .map((candidate) => ({
      candidate,
      distance: rayCircleDistance(origin, direction, candidate.center, candidate.radius),
    }))
    .filter(
      (entry): entry is { candidate: RayCircleCandidate; distance: number } =>
        entry.distance !== null,
    )
    .sort(
      (left, right) =>
        left.distance - right.distance || left.candidate.id.localeCompare(right.candidate.id),
    );

  const hit = hits[0];
  if (!hit) return null;
  return {
    id: hit.candidate.id,
    distance: hit.distance,
    point: {
      x: origin.x + direction.x * hit.distance,
      y: origin.y + direction.y * hit.distance,
    },
  };
}
