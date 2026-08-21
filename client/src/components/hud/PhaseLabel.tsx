import type { MatchPhase } from '@invisi-fight/shared';

export function PhaseLabel(phase: MatchPhase): HTMLElement {
  const label = document.createElement('div');
  label.className = `phase-label phase-label--${phase}`;
  label.role = 'status';
  label.textContent = phase === 'results' ? 'Match complete' : phase;
  return label;
}
