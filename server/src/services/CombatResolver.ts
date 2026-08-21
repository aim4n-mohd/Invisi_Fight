import {
  GAMEPLAY_CONFIG,
  firstRayHit,
  type ShotResolutionEvent,
  type Vector2,
} from '@invisi-fight/shared';
import { nanoid } from 'nanoid';

export interface Combatant {
  playerId: string;
  position: Vector2;
  aimAngleRad: number;
  lockedAimAngleRad: number;
  hearts: number;
  alive: boolean;
  velocity: Vector2;
  inputSequence: number;
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
  ): ShotResolutionEvent {
    const direction = {
      x: Math.cos(shooter.lockedAimAngleRad),
      y: Math.sin(shooter.lockedAimAngleRad),
    };
    const end = {
      x: shooter.position.x + direction.x * GAMEPLAY_CONFIG.lockedShotRangePx,
      y: shooter.position.y + direction.y * GAMEPLAY_CONFIG.lockedShotRangePx,
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
      };
    }

    const hit = firstRayHit(
      shooter.position,
      shooter.lockedAimAngleRad,
      combatants.map((combatant) => ({
        id: combatant.playerId,
        center: combatant.position,
        radius: GAMEPLAY_CONFIG.playerRadius,
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
    };
  }
}
