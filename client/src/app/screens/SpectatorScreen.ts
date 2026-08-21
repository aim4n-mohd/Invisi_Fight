import { FiringOrderPanel } from '../../components/hud/FiringOrderPanel.js';
import { PhaseLabel } from '../../components/hud/PhaseLabel.js';
import { matchViewStore } from '../../state/matchViewStore.js';
import { disposeWhenDetached } from './disposeWhenDetached.js';
import { screenFrame } from './screenFrame.js';

export function SpectatorScreen(): HTMLElement {
  const screen = screenFrame(
    'Read-only view',
    'You are spectating',
    'Late joiners and eliminated players can watch public resolution events until the next match.',
  );
  const panel = document.createElement('div');
  panel.className = 'panel stack';
  const render = () => {
    const state = matchViewStore.getState();
    panel.replaceChildren(
      PhaseLabel(state.phase),
      FiringOrderPanel(state.firingOrder, state.players, state.activeShooterId),
    );
  };
  render();
  const unsubscribe = matchViewStore.subscribe(render);
  disposeWhenDetached(screen, unsubscribe);
  screen.append(panel);
  return screen;
}
