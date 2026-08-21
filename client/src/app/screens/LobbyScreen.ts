import { GAMEPLAY_CONFIG } from '@invisi-fight/shared';
import { FiringOrderPanel } from '../../components/hud/FiringOrderPanel.js';
import { Button } from '../../components/ui/Button.js';
import { Badge } from '../../components/ui/Badge.js';
import { roomClient } from '../../network/colyseusClient.js';
import { matchViewStore } from '../../state/matchViewStore.js';
import { sessionStore } from '../../state/sessionStore.js';
import { disposeWhenDetached } from './disposeWhenDetached.js';
import { screenFrame } from './screenFrame.js';

export function LobbyScreen(): HTMLElement {
  const screen = screenFrame(
    'Room lobby',
    'Waiting for the fight',
    'Share the room code, then the host can start once two players are present.',
  );
  const content = document.createElement('div');
  content.className = 'lobby-grid';

  const render = () => {
    const state = matchViewStore.getState();
    const session = sessionStore.getState().roomSession;
    const localPlayer = state.players.find((player) => player.playerId === session?.playerId);
    const playerPanel = document.createElement('section');
    playerPanel.className = 'panel stack';
    const heading = document.createElement('div');
    heading.className = 'cluster cluster--between';
    const title = document.createElement('h2');
    title.textContent = `Room ${session?.roomCode ?? '—'}`;
    const copy = Button({
      label: 'Copy code',
      onClick: () => void navigator.clipboard?.writeText(session?.roomCode ?? ''),
    });
    heading.append(title, copy);
    const roster = document.createElement('ul');
    roster.className = 'player-list';
    state.players.forEach((player) => {
      const item = document.createElement('li');
      item.className = 'player-list__item';
      const name = document.createElement('strong');
      name.textContent = `${player.displayName}${player.playerId === session?.playerId ? ' (you)' : ''}`;
      const tags = document.createElement('span');
      tags.className = 'cluster';
      if (player.isHost) tags.append(Badge('Host'));
      if (!player.connected) tags.append(Badge('Reconnecting'));
      item.append(name, tags);
      roster.append(item);
    });
    if (state.players.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'muted';
      empty.textContent = 'Waiting for the room roster…';
      roster.append(empty);
    }
    playerPanel.append(heading, roster);

    const actionPanel = document.createElement('section');
    actionPanel.className = 'panel stack';
    const actionTitle = document.createElement('h2');
    actionTitle.textContent = localPlayer?.isHost ? 'Host controls' : 'Ready when the host is';
    const activePlayers = state.players.filter(
      (player) => player.role !== 'spectator' && player.connected,
    ).length;
    const guidance = document.createElement('p');
    guidance.className = 'muted';
    guidance.textContent =
      activePlayers >= GAMEPLAY_CONFIG.minPlayersToStart
        ? 'The room is ready. Starting locks this roster into the next match.'
        : `Need ${GAMEPLAY_CONFIG.minPlayersToStart - activePlayers} more player to start.`;
    actionPanel.append(actionTitle, guidance);
    if (localPlayer?.isHost) {
      actionPanel.append(
        Button({
          label: 'Start match',
          variant: 'primary',
          disabled: activePlayers < GAMEPLAY_CONFIG.minPlayersToStart,
          onClick: () => roomClient.startMatch(),
        }),
      );
    }
    actionPanel.append(FiringOrderPanel(state.firingOrder, state.players, null));
    content.replaceChildren(playerPanel, actionPanel);
  };
  render();
  const unsubscribe = matchViewStore.subscribe(render);
  disposeWhenDetached(screen, unsubscribe);
  screen.append(content);
  return screen;
}
