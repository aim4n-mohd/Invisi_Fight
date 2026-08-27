import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TimerDisplay, countdownSeconds } from '../src/components/hud/TimerDisplay.js';
import { serverClock } from '../src/network/serverClock.js';

describe('TimerDisplay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    serverClock.reset();
    serverClock.synchronize(1_000, 1_000);
  });

  afterEach(() => {
    document.body.replaceChildren();
    vi.useRealTimers();
  });

  it('uses whole seconds and preserves the full Hunt opening value', () => {
    expect(countdownSeconds(15_001)).toBe(16);
    expect(countdownSeconds(15_000)).toBe(15);
    expect(countdownSeconds(14_001)).toBe(15);
    expect(countdownSeconds(0)).toBe(0);
  });

  it('shows visible warning and urgent states at 5 and 3 seconds', () => {
    const timer = TimerDisplay('hunt', 16_000);
    document.body.append(timer);
    const value = timer.querySelector<HTMLElement>('.countdown__value');
    expect(value?.textContent).toBe('15');
    expect(timer.dataset.warning).toBe('false');

    vi.advanceTimersByTime(10_000);
    expect(value?.textContent).toBe('5');
    expect(timer.dataset.warning).toBe('true');
    expect(timer.dataset.urgent).toBe('false');

    vi.advanceTimersByTime(2_000);
    expect(value?.textContent).toBe('3');
    expect(timer.dataset.urgent).toBe('true');
    expect(timer.getAttribute('aria-label')).toContain('3 seconds');
  });
});
