import { beforeEach, describe, expect, it } from 'vitest';
import { matchViewStore } from '../src/state/matchViewStore.js';

describe('matchViewStore public sonar emissions', () => {
  beforeEach(() => matchViewStore.getState().reset());

  it('deduplicates emissions and prunes them by server time', () => {
    const emission = {
      type: 'sonar_emission' as const,
      emissionId: 'pulse-1',
      emitterId: 'player-1',
      approximateOrigin: { x: 96, y: 240 },
      radius: 320,
      emittedAtServerMs: 1_000,
      expiresAtServerMs: 1_500,
    };
    matchViewStore.getState().addSonarEmission(emission);
    matchViewStore.getState().addSonarEmission(emission);
    expect(matchViewStore.getState().sonarEmissions).toHaveLength(1);
    expect(matchViewStore.getState().sonarEmissionCount).toBe(1);

    matchViewStore.getState().pruneSonarEmissions(1_501);
    expect(matchViewStore.getState().sonarEmissions).toHaveLength(0);
    expect(matchViewStore.getState().sonarEmissionCount).toBe(1);
  });
});
