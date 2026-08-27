import { describe, expect, it } from 'vitest';
import { MATCH_PHASES, type MatchPhase } from '../src/index.js';

describe('match phases', () => {
  it('should expose the complete v2 phase order without the legacy planning phase', () => {
    expect(MATCH_PHASES).toEqual(['lobby', 'hunt', 'commit', 'resolution', 'recap', 'results']);
    expect(MATCH_PHASES).not.toContain('planning');
  });

  it('should keep every runtime phase assignable to the shared phase type', () => {
    const phases: readonly MatchPhase[] = MATCH_PHASES;
    expect(phases).toHaveLength(6);
  });
});
