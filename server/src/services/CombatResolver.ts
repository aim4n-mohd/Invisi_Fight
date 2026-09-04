import {
  GAMEPLAY_CONFIG,
  firstRayHit,
  type ShotResolutionEvent,
  type ShotLockSource,
  type Vector2,
} from '@invisi-fight/shared';
import { nanoid } from 'nanoid';

export interface Combatant {
  playerId: string;
  position: Vector2;
  aimAngleRad: number;
  lockedAimAngleRad: number;
  lockSource: ShotLockSource | null;
  lockSequence: number;
  lockedAtServerMs: number;
  hearts: number;
  alive: boolean;
  velocity: Vector2;
  inputSequence: number;
  running: boolean;
  fireReadyAtServerMs: number;
  decoyAvailable: boolean;
  lastFireSequence: number;
  lastDecoySequence: number;
}

export interface ShotResolutionOptions {
  aimAngleRad?: number;
  hitRadiusPx?: number;
  rangePx?: number;
  requestSequence?: number;
  includeOriginOverlap?: boolean;
}

function stablePairAngle(leftId: string, rightId: string): number {
  const value = `${leftId}:${rightId}`
    .split('')
    .reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0, 7);
  return (value / 0xffffffff) * Math.PI * 2;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export class CombatResolver {
  separateOverlaps(combatants: Combatant[]): void {
    const living = combatants
      .filter((combatant) => combatant.alive)
      .sort((a, b) => a.playerId.localeCompare(b.playerId));
    const minimumDistance = GAMEPLAY_CONFIG.playerRadius * 2 + GAMEPLAY_CONFIG.overlapSeparationPx;

    for (let pass = 0; pass < 6; pass += 1) {
      for (let leftIndex = 0; leftIndex < living.length; leftIndex += 1) {
        for (let rightIndex = leftIndex + 1; rightIndex < living.length; rightIndex += 1) {
          const left = living[leftIndex];
          const right = living[rightIndex];
          if (!left || !right) continue;
          let dx = right.position.x - left.position.x;
          let dy = right.position.y - left.position.y;
          let distance = Math.hypot(dx, dy);
          if (distance >= minimumDistance) continue;
          if (distance === 0) {
            const angle = stablePairAngle(left.playerId, right.playerId);
            dx = Math.cos(angle);
            dy = Math.sin(angle);
            distance = 1;
          }
          const push = (minimumDistance - distance) / 2;
          const nx = dx / distance;
          const ny = dy / distance;
          left.position.x = clamp(
            left.position.x - nx * push,
            GAMEPLAY_CONFIG.playerRadius,
            GAMEPLAY_CONFIG.arenaWidth - GAMEPLAY_CONFIG.playerRadius,
          );
          left.position.y = clamp(
            left.position.y - ny * push,
            GAMEPLAY_CONFIG.playerRadius,
            GAMEPLAY_CONFIG.arenaHeight - GAMEPLAY_CONFIG.playerRadius,
          );
          right.position.x = clamp(
            right.position.x + nx * push,
            GAMEPLAY_CONFIG.playerRadius,
            GAMEPLAY_CONFIG.arenaWidth - GAMEPLAY_CONFIG.playerRadius,
          );
          right.position.y = clamp(
            right.position.y + ny * push,
            GAMEPLAY_CONFIG.playerRadius,
            GAMEPLAY_CONFIG.arenaHeight - GAMEPLAY_CONFIG.playerRadius,
          );
        }
      }
    }
  }

  resolveShot(
    shooter: Combatant,
    combatants: Combatant[],
    roundNumber: number,
    resolvedAtServerMs: number,
    options: ShotResolutionOptions = {},
  ): ShotResolutionEvent {
    const aimAngleRad = options.aimAngleRad ?? shooter.lockedAimAngleRad;
    const direction = {
      x: Math.cos(aimAngleRad),
      y: Math.sin(aimAngleRad),
    };
    const end = {
      x: shooter.position.x + direction.x * (options.rangePx ?? GAMEPLAY_CONFIG.lockedShotRangePx),
      y: shooter.position.y + direction.y * (options.rangePx ?? GAMEPLAY_CONFIG.lockedShotRangePx),
    };
    if (!shooter.alive) {
      return {
        type: 'shot_resolved',
        shotId: nanoid(12),
        roundNumber,
        shooterId: shooter.playerId,
        targetId: null,
        origin: { ...shooter.position },
        end,
        cancelled: true,
        fatal: false,
        resolvedAtServerMs,
        ...(options.requestSequence === undefined
          ? {}
          : { requestSequence: options.requestSequence }),
      };
    }

    // Echo fighters pass through each other. If the ray starts inside a body,
    // that is already the first intersection, not the circle's farther exit.
    // Classic retains its original separated-body geometry and default path.
    const originOverlap = options.includeOriginOverlap
      ? combatants
          .filter(
            (candidate) =>
              candidate.alive &&
              candidate.playerId !== shooter.playerId &&
              Math.hypot(
                candidate.position.x - shooter.position.x,
                candidate.position.y - shooter.position.y,
              ) <= (options.hitRadiusPx ?? GAMEPLAY_CONFIG.shotHitRadiusPx),
          )
          .sort((left, right) => left.playerId.localeCompare(right.playerId))[0]
      : undefined;
    const hit = originOverlap
      ? { id: originOverlap.playerId, distance: 0, point: { ...shooter.position } }
      : firstRayHit(
          shooter.position,
          aimAngleRad,
          combatants.map((combatant) => ({
            id: combatant.playerId,
            center: combatant.position,
            radius: options.hitRadiusPx ?? GAMEPLAY_CONFIG.shotHitRadiusPx,
            alive: combatant.alive,
          })),
          shooter.playerId,
        );
    const target = hit ? combatants.find((combatant) => combatant.playerId === hit.id) : undefined;
    if (target) {
      target.hearts = Math.max(0, target.hearts - 1);
      if (target.hearts === 0) target.alive = false;
    }
    return {
      type: 'shot_resolved',
      shotId: nanoid(12),
      roundNumber,
      shooterId: shooter.playerId,
      targetId: target?.playerId ?? null,
      origin: { ...shooter.position },
      end: hit?.point ?? end,
      cancelled: false,
      fatal: target ? !target.alive : false,
      resolvedAtServerMs,
      ...(options.requestSequence === undefined
        ? {}
        : { requestSequence: options.requestSequence }),
    };
  }
}
