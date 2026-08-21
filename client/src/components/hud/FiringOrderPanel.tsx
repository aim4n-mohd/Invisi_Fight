import type { PublicPlayerState } from '@invisi-fight/shared';
import { Badge } from '../ui/Badge.js';

export function FiringOrderPanel(
  order: readonly string[],
  players: readonly PublicPlayerState[],
  activeShooterId: string | null,
): HTMLElement {
  const panel = document.createElement('section');
  panel.className = 'firing-order';
  panel.setAttribute('aria-label', 'Firing order');
  const title = document.createElement('span');
  title.className = 'hud-stat__label';
  title.textContent = 'Firing order';
  const list = document.createElement('div');
  list.className = 'cluster';
  order.forEach((playerId, index) => {
    const player = players.find((entry) => entry.playerId === playerId);
    const badge = Badge(`${index + 1}. ${player?.displayName ?? 'Unknown'}`);
    if (playerId === activeShooterId) badge.dataset.active = 'true';
    if (!player?.alive) badge.dataset.eliminated = 'true';
    list.append(badge);
  });
  panel.append(title, list);
  return panel;
}
