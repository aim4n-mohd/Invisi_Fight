import { GAMEPLAY_CONFIG } from '@invisi-fight/shared';

export interface PlanningWindow {
  startedAtServerMs: number;
  endsAtServerMs: number;
}

export class MatchClock {
  constructor(readonly now: () => number = Date.now) {}

  planningWindow(): PlanningWindow {
    const startedAtServerMs = this.now();
    return {
      startedAtServerMs,
      endsAtServerMs: startedAtServerMs + GAMEPLAY_CONFIG.planningDurationMs,
    };
  }

  hasExpired(endsAtServerMs: number): boolean {
    return this.now() >= endsAtServerMs;
  }
}
