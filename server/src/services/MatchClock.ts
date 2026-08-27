import { GAMEPLAY_CONFIG } from '@invisi-fight/shared';

export interface PhaseWindow {
  startedAtServerMs: number;
  endsAtServerMs: number;
}

export class MatchClock {
  constructor(readonly now: () => number = Date.now) {}

  huntWindow(): PhaseWindow {
    return this.#window(GAMEPLAY_CONFIG.huntDurationMs);
  }

  commitWindow(): PhaseWindow {
    return this.#window(GAMEPLAY_CONFIG.commitDurationMs);
  }

  recapWindow(): PhaseWindow {
    return this.#window(GAMEPLAY_CONFIG.recapDurationMs);
  }

  #window(durationMs: number): PhaseWindow {
    const startedAtServerMs = this.now();
    return {
      startedAtServerMs,
      endsAtServerMs: startedAtServerMs + durationMs,
    };
  }

  hasExpired(endsAtServerMs: number): boolean {
    return this.now() >= endsAtServerMs;
  }
}
