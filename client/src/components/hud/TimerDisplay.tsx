import { serverClock } from '../../network/serverClock.js';

export function TimerDisplay(expiresAtServerMs: number | null): HTMLElement {
  const timer = document.createElement('div');
  timer.className = 'hud-stat';
  timer.setAttribute('role', 'timer');
  const label = document.createElement('span');
  label.className = 'hud-stat__label';
  label.textContent = 'Time';
  const value = document.createElement('strong');
  value.className = 'hud-stat__value';
  const update = () => {
    const remainingMs = expiresAtServerMs ? Math.max(0, expiresAtServerMs - serverClock.now()) : 0;
    value.textContent = expiresAtServerMs ? `${(remainingMs / 1_000).toFixed(1)}s` : '—';
    value.dataset.warning = String(remainingMs <= 3_000 && remainingMs > 0);
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
  timer.append(label, value);
  return timer;
}
