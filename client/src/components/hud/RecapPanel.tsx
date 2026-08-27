import type { MatchPhase, PublicPlayerState, RecapEntry } from '@invisi-fight/shared';

export function shouldShowRoundRecap(
  phase: MatchPhase,
  resolvedShotCount: number,
  expectedShotCount: number,
): boolean {
  return (
    phase === 'recap' ||
    (phase === 'resolution' && expectedShotCount > 0 && resolvedShotCount >= expectedShotCount)
  );
}

function playerName(playerId: string | null, players: readonly PublicPlayerState[]): string {
  if (!playerId) return 'No target';
  return players.find((player) => player.playerId === playerId)?.displayName ?? 'Unknown player';
}

function recapText(entry: RecapEntry, players: readonly PublicPlayerState[]): string {
  const shooter = playerName(entry.shooterId, players);
  if (entry.outcome === 'cancelled') return `${shooter}'s shot was cancelled`;
  if (entry.outcome === 'miss') return `${shooter} missed`;
  const target = playerName(entry.targetId, players);
  if (entry.fatal) return `${shooter} hit ${target} - eliminated`;
  const hearts = entry.targetHeartsRemaining ?? 0;
  return `${shooter} hit ${target} - ${hearts} ${hearts === 1 ? 'heart' : 'hearts'}`;
}

export function RecapPanel(
  entries: readonly RecapEntry[],
  players: readonly PublicPlayerState[],
  nextFirstShooterId: string | null,
): HTMLElement {
  const panel = document.createElement('section');
  panel.className = 'match-recap';
  panel.setAttribute('aria-label', 'Round recap');
  const heading = document.createElement('strong');
  heading.className = 'match-recap__heading';
  heading.textContent = 'Round recap';
  const list = document.createElement('ol');
  list.className = 'recap-list';
  [...entries]
    .sort((left, right) => left.orderIndex - right.orderIndex)
    .forEach((entry) => {
      const item = document.createElement('li');
      item.className = 'recap-list__item';
      item.textContent = recapText(entry, players);
      item.dataset.outcome = entry.outcome;
      list.append(item);
    });
  const preview = document.createElement('span');
  preview.className = 'match-recap__next';
  preview.textContent = nextFirstShooterId
    ? `${playerName(nextFirstShooterId, players)} starts next`
    : 'Match point resolved';
  panel.append(heading, list, preview);
  return panel;
}
