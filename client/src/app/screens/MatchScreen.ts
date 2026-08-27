import { ActionPanel } from '../../components/hud/ActionPanel.js';
import { FiringOrderPanel } from '../../components/hud/FiringOrderPanel.js';
import { HeartMeter } from '../../components/hud/HeartMeter.js';
import { PhaseLabel } from '../../components/hud/PhaseLabel.js';
import { RecapPanel, shouldShowRoundRecap } from '../../components/hud/RecapPanel.js';
import { TimerDisplay } from '../../components/hud/TimerDisplay.js';
import { matchViewStore } from '../../state/matchViewStore.js';
import { privateSnapshotStore } from '../../state/privateSnapshotStore.js';
import { activeOnboardingCue, onboardingStore } from '../../state/onboardingStore.js';
import { roomClient } from '../../network/colyseusClient.js';
import { sessionStore } from '../../state/sessionStore.js';
import { disposeWhenDetached } from './disposeWhenDetached.js';
import { mountArena } from './mountArena.js';
import { screenFrame } from './screenFrame.js';

export function MatchScreen(): HTMLElement {
  const screen = screenFrame('Live match', 'Invisi Fight', 'Find them before they find you.');
  screen.classList.add('screen--game');
  const hud = document.createElement('section');
  hud.className = 'match-hud';
  hud.setAttribute('aria-label', 'Match status');
  const recapRegion = document.createElement('div');
  recapRegion.className = 'match-recap-region';
  const gameFrame = document.createElement('div');
  gameFrame.id = 'game-frame';
  const disposeArena = mountArena(gameFrame);
  screen.append(hud, recapRegion, gameFrame);

  const renderHud = () => {
    const state = matchViewStore.getState();
    const privateState = privateSnapshotStore.getState();
    const onboarding = onboardingStore.getState();
    const onboardingCue = activeOnboardingCue(state.phase, onboarding.completed);
    const localId = sessionStore.getState().roomSession?.playerId;
    const local = state.players.find((player) => player.playerId === localId);
    const showRecap = shouldShowRoundRecap(
      state.phase,
      state.recapEntries.length,
      state.firingOrder.length,
    );
    hud.replaceChildren(
      PhaseLabel(state.phase),
      TimerDisplay(state.phase, state.phaseEndsAtServerMs),
      ActionPanel({
        phase: state.phase,
        sonarReadyAtServerMs: privateState.sonarReadyAtServerMs,
        pendingShotLock: privateState.pendingShotLock,
        shotLockStatus: privateState.shotLockStatus,
        activeShooterName:
          state.players.find((player) => player.playerId === state.activeShooterId)?.displayName ??
          null,
        onSonar: () => {
          if (roomClient.triggerSonar()) onboardingStore.getState().complete('scan');
        },
        onboardingCue,
      }),
      HeartMeter(local?.hearts ?? 0),
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
  renderHud();
  const unsubscribe = matchViewStore.subscribe(renderHud);
  const unsubscribePrivate = privateSnapshotStore.subscribe((state, previous) => {
    if (
      state.sonarReadyAtServerMs !== previous.sonarReadyAtServerMs ||
      state.pendingShotLock !== previous.pendingShotLock ||
      state.shotLockStatus !== previous.shotLockStatus
    ) {
      renderHud();
    }
  });
  const unsubscribeOnboarding = onboardingStore.subscribe(renderHud);
  disposeWhenDetached(screen, () => {
    unsubscribe();
    unsubscribePrivate();
    unsubscribeOnboarding();
    disposeArena();
  });
  return screen;
}
