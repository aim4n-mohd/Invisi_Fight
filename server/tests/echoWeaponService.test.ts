import { describe, expect, it } from 'vitest';
import { ECHO_GAMEPLAY_CONFIG as ECHO } from '@invisi-fight/shared';
import { EchoWeaponService } from '../src/services/EchoWeaponService.js';

describe('Echo magazine authority', () => {
  it('waits after empty, clicks twice, and blocks firing until automatic reload completes', () => {
    const weapon = new EchoWeaponService();
    weapon.fire('p', 100);
    expect(weapon.advanceReload('p', 9999)).toEqual({ clicks: 0, completed: false });
    expect(weapon.snapshot('p').ammo).toBe(2);
    weapon.fire('p', 10000);
    weapon.fire('p', 11000);
    const start = 11000 + ECHO.reloadStartDelayMs;
    const end = start + ECHO.reloadDurationMs;
    expect(weapon.snapshot('p')).toMatchObject({ ammo: 0, reloadEndsAtServerMs: end });
    expect(weapon.fire('p', 11001)).toBe('reloading');
    expect(weapon.advanceReload('p', start - 1)).toEqual({ clicks: 0, completed: false });
    expect(weapon.advanceReload('p', start)).toEqual({ clicks: 1, completed: false });
    expect(weapon.advanceReload('p', start)).toEqual({ clicks: 0, completed: false });
    expect(weapon.advanceReload('p', end - 1)).toEqual({ clicks: 0, completed: false });
    expect(weapon.fire('p', end - 1)).toBe('reloading');
    expect(weapon.advanceReload('p', end)).toEqual({ clicks: 1, completed: true });
    expect(weapon.snapshot('p').ammo).toBe(3);
    expect(weapon.advanceReload('p', end + 1)).toEqual({ clicks: 0, completed: false });
    expect(weapon.fire('p', end + 1)).toBeNull();
  });

  it('cancels pending clicks and reload on match reset', () => {
    const weapon = new EchoWeaponService();
    for (let i = 0; i < 3; i++) weapon.fire('p', i * 650);
    weapon.advanceReload('p', 1300 + ECHO.reloadStartDelayMs);
    weapon.resetMagazine('p');
    expect(weapon.snapshot('p')).toMatchObject({ ammo: 3, reloadEndsAtServerMs: 0 });
    expect(weapon.advanceReload('p', 99999)).toEqual({ clicks: 0, completed: false });
  });

  it('catches up a delayed tick once and isolates removed players and room disposal', () => {
    const weapon = new EchoWeaponService();
    for (let i = 0; i < 3; i++) weapon.fire('a', i * 650);
    expect(weapon.snapshot('b').ammo).toBe(3);
    expect(weapon.advanceReload('a', 99999)).toEqual({ clicks: 2, completed: true });
    expect(weapon.advanceReload('a', 99999)).toEqual({ clicks: 0, completed: false });
    for (let i = 0; i < 3; i++) weapon.fire('a', 100000 + i * 650);
    weapon.remove('a');
    expect(weapon.advanceReload('a', 999999)).toEqual({ clicks: 0, completed: false });
    weapon.fire('b', 100);
    weapon.clear();
    expect(weapon.snapshot('b').ammo).toBe(3);
  });
});
