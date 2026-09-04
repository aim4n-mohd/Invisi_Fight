import { ECHO_GAMEPLAY_CONFIG as ECHO, type EchoActionRejectionReason } from '@invisi-fight/shared';

interface Magazine {
  ammo: number;
  reloadEndsAtServerMs: number;
  reloadClicksEmitted: number;
}

/** Private, tick-driven state. Resetting a magazine also cancels its pending clicks. */
export class EchoWeaponService {
  readonly #magazines = new Map<string, Magazine>();

  #get(playerId: string): Magazine {
    let magazine = this.#magazines.get(playerId);
    if (!magazine) {
      magazine = { ammo: ECHO.magazineSize, reloadEndsAtServerMs: 0, reloadClicksEmitted: 0 };
      this.#magazines.set(playerId, magazine);
    }
    return magazine;
  }

  snapshot(playerId: string): Magazine {
    return { ...this.#get(playerId) };
  }

  /** The room broadcasts due clicks before acknowledging the refill or accepting another shot. */
  advanceReload(playerId: string, now: number): { clicks: number; completed: boolean } {
    const magazine = this.#get(playerId);
    const end = magazine.reloadEndsAtServerMs;
    if (!end) return { clicks: 0, completed: false };
    const due = now >= end ? 2 : now >= end - ECHO.reloadDurationMs ? 1 : 0;
    const clicks = Math.max(0, due - magazine.reloadClicksEmitted);
    magazine.reloadClicksEmitted = due;
    const completed = now >= end;
    if (completed) this.resetMagazine(playerId);
    return { clicks, completed };
  }

  fire(playerId: string, now: number): EchoActionRejectionReason | null {
    const magazine = this.#get(playerId);
    if (magazine.reloadEndsAtServerMs) return 'reloading';
    magazine.ammo -= 1;
    if (magazine.ammo === 0) {
      magazine.reloadEndsAtServerMs = now + ECHO.reloadStartDelayMs + ECHO.reloadDurationMs;
      magazine.reloadClicksEmitted = 0;
    }
    return null;
  }

  resetMagazine(playerId: string): void {
    const magazine = this.#get(playerId);
    magazine.ammo = ECHO.magazineSize;
    magazine.reloadEndsAtServerMs = 0;
    magazine.reloadClicksEmitted = 0;
  }

  remove(playerId: string): void {
    this.#magazines.delete(playerId);
  }

  clear(): void {
    this.#magazines.clear();
  }
}
