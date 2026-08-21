import { describe, expect, it } from 'vitest';
import { CombatResolver, type Combatant } from '../src/services/CombatResolver.js';

function combatant(playerId: string, x: number, y: number, aim = 0): Combatant {
  return {
    playerId,
    position: { x, y },
    aimAngleRad: aim,
    lockedAimAngleRad: aim,
    hearts: 3,
    alive: true,
    velocity: { x: 0, y: 0 },
    inputSequence: 0,
  };
}

describe('CombatResolver', () => {
  it('should separate exact overlaps deterministically', () => {
    const resolver = new CombatResolver();
    const players = [combatant('a', 300, 200), combatant('b', 300, 200)];
    resolver.separateOverlaps(players);
    const firstResult = players.map((player) => ({ ...player.position }));
    const repeat = [combatant('a', 300, 200), combatant('b', 300, 200)];
    resolver.separateOverlaps(repeat);
    expect(repeat.map((player) => player.position)).toEqual(firstResult);
    expect(
      Math.hypot(
        players[0]!.position.x - players[1]!.position.x,
        players[0]!.position.y - players[1]!.position.y,
      ),
    ).toBeGreaterThan(32);
  });

  it('should apply one heart to only the first intersected player', () => {
    const resolver = new CombatResolver();
    const players = [
      combatant('shooter', 100, 100),
      combatant('near', 200, 100),
      combatant('far', 300, 100),
    ];
    const event = resolver.resolveShot(players[0]!, players, 1, 5_000);
    expect(event.targetId).toBe('near');
    expect(players[1]!.hearts).toBe(2);
    expect(players[2]!.hearts).toBe(3);
  });

  it('should cancel a locked shot when the shooter died before their turn', () => {
    const resolver = new CombatResolver();
    const shooter = combatant('shooter', 100, 100);
    shooter.hearts = 0;
    shooter.alive = false;
    const event = resolver.resolveShot(shooter, [shooter], 1, 5_000);
    expect(event.cancelled).toBe(true);
  });

  it('should eliminate a target on its final heart without knockback', () => {
    const resolver = new CombatResolver();
    const shooter = combatant('shooter', 100, 100);
    const target = combatant('target', 200, 100);
    target.hearts = 1;
    const before = { ...target.position };
    const event = resolver.resolveShot(shooter, [shooter, target], 1, 5_000);
    expect(event.fatal).toBe(true);
    expect(target.alive).toBe(false);
    expect(target.position).toEqual(before);
  });
});
