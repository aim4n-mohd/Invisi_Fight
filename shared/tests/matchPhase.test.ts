import { describe, expect, it } from 'vitest';
import {
  CLASSIC_PHASES,
  ECHO_PHASES,
  MATCH_PHASES,
  isLegalModePhase,
  type MatchPhase,
} from '../src/index.js';

describe('match phases', () => {
  it('keeps the complete Classic phase order while adding Echo phases', () => {
    expect(CLASSIC_PHASES).toEqual(['lobby', 'hunt', 'commit', 'resolution', 'recap', 'results']);
    expect(ECHO_PHASES).toEqual(['lobby', 'countdown', 'echo_hunt', 'final_echo', 'results']);
    expect(MATCH_PHASES).not.toContain('planning');
  });

  it('should keep every runtime phase assignable to the shared phase type', () => {
    const phases: readonly MatchPhase[] = MATCH_PHASES;
    expect(phases).toHaveLength(9);
    expect(isLegalModePhase('classic', 'commit')).toBe(true);
    expect(isLegalModePhase('classic', 'final_echo')).toBe(false);
    expect(isLegalModePhase('echo_hunt', 'final_echo')).toBe(true);
    expect(isLegalModePhase('echo_hunt', 'resolution')).toBe(false);
  });
});
