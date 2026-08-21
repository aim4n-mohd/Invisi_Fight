import { FiringOrderPanel } from '../../components/hud/FiringOrderPanel.js';
import { HeartMeter } from '../../components/hud/HeartMeter.js';
import { PhaseLabel } from '../../components/hud/PhaseLabel.js';
import { TimerDisplay } from '../../components/hud/TimerDisplay.js';
import { matchViewStore } from '../../state/matchViewStore.js';
import { sessionStore } from '../../state/sessionStore.js';
import { disposeWhenDetached } from './disposeWhenDetached.js';
import { screenFrame } from './screenFrame.js';

export function MatchScreen(): HTMLElement {
  const screen = screenFrame(
    'Live match',
    'Stay unreadable',
    'Use WASD to move and the mouse to lock your firing line before the timer expires.',
  );
  const hud = document.createElement('section');
  hud.className = 'match-hud';
  hud.setAttribute('aria-label', 'Match status');
  const gameFrame = document.createElement('div');
  gameFrame.className = 'game-frame';
  gameFrame.id = 'game-frame';
  gameFrame.setAttribute('aria-busy', 'true');
  gameFrame.textContent = 'Loading arena…';
  screen.append(hud, gameFrame);
  let disposed = false;
  let game: { destroy: () => void } | null = null;
  void import('../../game/PhaserGame.js')
    .then(({ PhaserGame }) => {
      if (disposed) return;
      gameFrame.replaceChildren();
      gameFrame.setAttribute('aria-busy', 'false');
      game = new PhaserGame(gameFrame);
    })
    .catch(() => {
      if (disposed) return;
      gameFrame.setAttribute('aria-busy', 'false');
      gameFrame.textContent = 'The arena could not load. Refresh to try again.';
    });

  const renderHud = () => {
    const state = matchViewStore.getState();
    const localId = sessionStore.getState().roomSession?.playerId;
    const local = state.players.find((player) => player.playerId === localId);
    hud.replaceChildren(
      PhaseLabel(state.phase),
      TimerDisplay(state.phaseEndsAtServerMs),
      HeartMeter(local?.hearts ?? 0),
      FiringOrderPanel(state.firingOrder, state.players, state.activeShooterId),
    );
  };
  renderHud();
  const unsubscribe = matchViewStore.subscribe(renderHud);
  disposeWhenDetached(screen, () => {
    disposed = true;
    unsubscribe();
    game?.destroy();
  });
  return screen;
}
