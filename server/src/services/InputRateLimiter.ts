import { GAMEPLAY_CONFIG } from '@invisi-fight/shared';

interface InputWindow {
  startedAtMs: number;
  count: number;
}

export class InputRateLimiter {
  readonly #windows = new Map<string, InputWindow>();

  allow(playerId: string, nowMs = Date.now()): boolean {
    const existing = this.#windows.get(playerId);
    if (!existing || nowMs - existing.startedAtMs >= 1_000) {
      this.#windows.set(playerId, { startedAtMs: nowMs, count: 1 });
      return true;
    }
    if (existing.count >= GAMEPLAY_CONFIG.inputMessageMaxHz) return false;
    existing.count += 1;
    return true;
  }

  clear(): void {
    this.#windows.clear();
  }
}
