import type { MatchPhase, ShotLockStatusEvent } from '@invisi-fight/shared';
import { serverClock } from '../../network/serverClock.js';
import type { PendingShotLock } from '../../state/privateSnapshotStore.js';
import type { OnboardingCue } from '../../state/onboardingStore.js';

export interface ActionPanelOptions {
  phase: MatchPhase;
  sonarReadyAtServerMs: number;
  pendingShotLock: PendingShotLock | null;
  shotLockStatus: ShotLockStatusEvent | null;
  activeShooterName: string | null;
  onSonar: () => void;
  onboardingCue?: OnboardingCue | null;
}

function lockStatusText(options: ActionPanelOptions): string {
  if (options.pendingShotLock) return 'Locking';
  const status = options.shotLockStatus;
  if (!status) return 'Aim unlocked';
  if (!status.accepted) return 'Lock rejected';
  if (status.lockSource === 'automatic') return 'Auto-locked';
  return status.replaced ? 'Lock replaced' : 'Aim locked';
}

export function ActionPanel(options: ActionPanelOptions): HTMLElement {
  const panel = document.createElement('section');
  panel.className = 'action-panel';
  panel.dataset.phase = options.phase;
  if (options.onboardingCue) panel.dataset.onboardingCue = options.onboardingCue;
  panel.setAttribute('aria-label', 'Current action');
  const label = document.createElement('span');
  label.className = 'action-panel__label';
  const value = document.createElement('strong');
  value.className = 'action-panel__value';

  if (options.phase === 'hunt') {
    label.textContent = 'Sonar';
    const command = document.createElement('button');
    command.type = 'button';
    command.className = 'action-panel__command';
    command.textContent = 'Scan';
    command.title = 'Trigger sonar pulse';
    const key = document.createElement('kbd');
    key.className = 'action-panel__key';
    key.textContent = 'Space';
    const update = () => {
      const remainingMs = Math.max(0, options.sonarReadyAtServerMs - serverClock.now());
      const ready = remainingMs === 0;
      value.textContent = ready ? 'Ready' : `${(remainingMs / 1_000).toFixed(1)}s`;
      command.disabled = !ready;
      panel.dataset.ready = String(ready);
      panel.setAttribute(
        'aria-label',
        ready ? 'Sonar ready' : `Sonar ready in ${value.textContent}`,
      );
    };
    command.addEventListener('click', options.onSonar);
    update();
    const interval = window.setInterval(update, 100);
    const observer = new MutationObserver(() => {
      if (!panel.isConnected) {
        window.clearInterval(interval);
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    panel.append(label, value, command, key);
    return panel;
  }

  if (options.phase === 'commit') {
    label.textContent = 'Shot';
    value.textContent = lockStatusText(options);
    panel.dataset.lockState = options.pendingShotLock
      ? 'pending'
      : options.shotLockStatus?.accepted
        ? options.shotLockStatus.lockSource
        : options.shotLockStatus
          ? 'rejected'
          : 'open';
  } else if (options.phase === 'resolution') {
    label.textContent = 'Now firing';
    value.textContent = options.activeShooterName ?? 'Preparing';
  } else if (options.phase === 'recap') {
    label.textContent = 'Round';
    value.textContent = 'Complete';
  } else {
    label.textContent = 'Match';
    value.textContent = options.phase === 'results' ? 'Complete' : 'Waiting';
  }
  panel.append(label, value);
  return panel;
}
