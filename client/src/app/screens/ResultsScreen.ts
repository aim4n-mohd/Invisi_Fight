import { Button } from '../../components/ui/Button.js';
import { roomClient } from '../../network/colyseusClient.js';
import { matchViewStore } from '../../state/matchViewStore.js';
import { sessionStore } from '../../state/sessionStore.js';
import { screenFrame } from './screenFrame.js';

export function ResultsScreen(): HTMLElement {
  const state = matchViewStore.getState();
  const winner = state.players.find((player) => player.playerId === state.winnerPlayerId);
  const localPlayerId = sessionStore.getState().roomSession?.playerId;
  const localWon = winner?.playerId === localPlayerId;
  const screen = screenFrame(
    'Match complete',
    localWon ? 'You survived the dark.' : `${winner?.displayName ?? 'The last fighter'} wins.`,
    'The live room is still open. Reset the match state and return everyone to the lobby for another fight.',
  );
  const panel = document.createElement('div');
  panel.className = 'panel stack result-panel';
  panel.append(
    Button({
      label: 'Replay to lobby',
      variant: 'primary',
      onClick: () => roomClient.replayToLobby(),
    }),
  );
  screen.append(panel);
  return screen;
}
