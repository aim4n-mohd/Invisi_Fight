import { GAMEPLAY_CONFIG, type MatchPhase } from '@invisi-fight/shared';
import { serverClock } from '../../network/serverClock.js';

export function countdownSeconds(remainingMs: number): number {
  return Math.max(0, Math.ceil(remainingMs / 1_000));
}

function phaseDurationMs(phase: MatchPhase): number | null {
  if (phase === 'hunt') return GAMEPLAY_CONFIG.huntDurationMs;
  if (phase === 'commit') return GAMEPLAY_CONFIG.commitDurationMs;
  if (phase === 'recap') return GAMEPLAY_CONFIG.recapDurationMs;
  return null;
}

function phaseTimerLabel(phase: MatchPhase): string {
  if (phase === 'hunt') return 'Hunt';
  if (phase === 'commit') return 'Lock aim';
  if (phase === 'recap') return 'Next round';
  if (phase === 'resolution') return 'Resolving';
  return 'Time';
}

export function TimerDisplay(phase: MatchPhase, expiresAtServerMs: number | null): HTMLElement {
  const timer = document.createElement('div');
  timer.className = 'countdown';
  timer.setAttribute('role', 'timer');
  const label = document.createElement('span');
  label.className = 'countdown__label';
  label.textContent = phaseTimerLabel(phase);
  const value = document.createElement('strong');
  value.className = 'countdown__value';
  const progress = document.createElement('span');
  progress.className = 'countdown__progress';
  progress.setAttribute('aria-hidden', 'true');

  const update = () => {
    const remainingMs = expiresAtServerMs ? Math.max(0, expiresAtServerMs - serverClock.now()) : 0;
    const seconds = countdownSeconds(remainingMs);
    const durationMs = phaseDurationMs(phase);
    const elapsedRatio = durationMs ? 1 - Math.min(1, remainingMs / durationMs) : 1;
    value.textContent = expiresAtServerMs ? String(seconds) : '--';
    timer.dataset.warning = String(phase === 'hunt' && seconds <= 5 && seconds > 0);
    timer.dataset.urgent = String(phase === 'hunt' && seconds <= 3 && seconds > 0);
    timer.style.setProperty('--countdown-progress', `${Math.round(elapsedRatio * 100)}%`);
    timer.setAttribute(
      'aria-label',
      expiresAtServerMs ? `${phaseTimerLabel(phase)}: ${seconds} seconds` : phaseTimerLabel(phase),
    );
  };
  update();
  const interval = window.setInterval(update, 100);
  const observer = new MutationObserver(() => {
    if (!timer.isConnected) {
      window.clearInterval(interval);
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  timer.append(label, value, progress);
  return timer;
}
