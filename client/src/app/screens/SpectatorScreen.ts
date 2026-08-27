import { FiringOrderPanel } from '../../components/hud/FiringOrderPanel.js';
import { PhaseLabel } from '../../components/hud/PhaseLabel.js';
import { RecapPanel, shouldShowRoundRecap } from '../../components/hud/RecapPanel.js';
import { TimerDisplay } from '../../components/hud/TimerDisplay.js';
import { matchViewStore } from '../../state/matchViewStore.js';
import { disposeWhenDetached } from './disposeWhenDetached.js';
import { mountArena } from './mountArena.js';
import { screenFrame } from './screenFrame.js';

export function SpectatorScreen(): HTMLElement {
  const screen = screenFrame('Read-only view', 'Invisi Fight', 'Public match view.');
  screen.classList.add('screen--game');
  const hud = document.createElement('section');
  hud.className = 'match-hud match-hud--spectator';
  hud.setAttribute('aria-label', 'Spectator match status');
  const recapRegion = document.createElement('div');
  recapRegion.className = 'match-recap-region';
  const gameFrame = document.createElement('div');
  gameFrame.id = 'game-frame';
  const disposeArena = mountArena(gameFrame);
  const render = () => {
    const state = matchViewStore.getState();
    const showRecap = shouldShowRoundRecap(
      state.phase,
      state.recapEntries.length,
      state.firingOrder.length,
    );
    hud.replaceChildren(
      PhaseLabel(state.phase),
      TimerDisplay(state.phase, state.phaseEndsAtServerMs),
      FiringOrderPanel(state.firingOrder, state.players, state.activeShooterId),
    );
    recapRegion.replaceChildren(
      ...(showRecap
        ? [RecapPanel(state.recapEntries, state.players, state.nextFirstShooterId)]
        : []),
    );
    recapRegion.hidden = !showRecap;
    if (showRecap) document.documentElement.dataset.recapSeen = 'true';
  };
  render();
  const unsubscribe = matchViewStore.subscribe(render);
  disposeWhenDetached(screen, () => {
    unsubscribe();
    disposeArena();
  });
  screen.append(hud, recapRegion, gameFrame);
  return screen;
}
