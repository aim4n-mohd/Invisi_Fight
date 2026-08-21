import { FiringOrderPanel } from '../../components/hud/FiringOrderPanel.js';
import { PhaseLabel } from '../../components/hud/PhaseLabel.js';
import { TimerDisplay } from '../../components/hud/TimerDisplay.js';
import { matchViewStore } from '../../state/matchViewStore.js';
import { disposeWhenDetached } from './disposeWhenDetached.js';
import { mountArena } from './mountArena.js';
import { screenFrame } from './screenFrame.js';

export function SpectatorScreen(): HTMLElement {
  const screen = screenFrame(
    'Read-only view',
    'You are spectating',
    'Late joiners and eliminated players can watch public resolution events until the next match.',
  );
  screen.classList.add('screen--game');
  const hud = document.createElement('section');
  hud.className = 'match-hud match-hud--spectator';
  hud.setAttribute('aria-label', 'Spectator match status');
  const gameFrame = document.createElement('div');
  gameFrame.id = 'game-frame';
  const disposeArena = mountArena(gameFrame);
  const render = () => {
    const state = matchViewStore.getState();
    hud.replaceChildren(
      PhaseLabel(state.phase),
      TimerDisplay(state.phaseEndsAtServerMs),
      FiringOrderPanel(state.firingOrder, state.players, state.activeShooterId),
    );
  };
  render();
  const unsubscribe = matchViewStore.subscribe(render);
  disposeWhenDetached(screen, () => {
    unsubscribe();
    disposeArena();
  });
  screen.append(hud, gameFrame);
  return screen;
}
