import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ActionPanel } from '../src/components/hud/ActionPanel.js';
import { serverClock } from '../src/network/serverClock.js';

describe('ActionPanel', () => {
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

  it('shows a usable Scan command only when sonar is ready', () => {
    const onSonar = vi.fn();
    const ready = ActionPanel({
      phase: 'hunt',
      sonarReadyAtServerMs: 0,
      pendingShotLock: null,
      shotLockStatus: null,
      activeShooterName: null,
      onSonar,
    });
    document.body.append(ready);
    const button = ready.querySelector<HTMLButtonElement>('.action-panel__command');
    expect(button?.disabled).toBe(false);
    expect(ready.textContent).toContain('Ready');
    button?.click();
    expect(onSonar).toHaveBeenCalledOnce();

    const cooling = ActionPanel({
      phase: 'hunt',
      sonarReadyAtServerMs: 3_500,
      pendingShotLock: null,
      shotLockStatus: null,
      activeShooterName: null,
      onSonar,
    });
    document.body.append(cooling);
    expect(cooling.querySelector<HTMLButtonElement>('.action-panel__command')?.disabled).toBe(true);
    expect(cooling.textContent).toContain('2.5s');
  });

  it('makes pending, replaced, automatic, and rejected lock states explicit', () => {
    const base = {
      phase: 'commit' as const,
      sonarReadyAtServerMs: 0,
      activeShooterName: null,
      onSonar: () => undefined,
    };
    expect(
      ActionPanel({
        ...base,
        pendingShotLock: { requestSequence: 2, aimAngleRad: 1 },
        shotLockStatus: null,
      }).textContent,
    ).toContain('Locking');
    expect(
      ActionPanel({
        ...base,
        pendingShotLock: null,
        shotLockStatus: {
          type: 'shot_lock_status',
          accepted: true,
          requestSequence: 3,
          lockedAimAngleRad: 1,
          lockSource: 'explicit',
          replaced: true,
          serverTimeMs: 1_000,
        },
      }).textContent,
    ).toContain('Lock replaced');
    expect(
      ActionPanel({
        ...base,
        pendingShotLock: null,
        shotLockStatus: {
          type: 'shot_lock_status',
          accepted: true,
          requestSequence: 0,
          lockedAimAngleRad: 1,
          lockSource: 'automatic',
          replaced: false,
          serverTimeMs: 1_000,
        },
      }).textContent,
    ).toContain('Auto-locked');
    expect(
      ActionPanel({
        ...base,
        pendingShotLock: null,
        shotLockStatus: {
          type: 'shot_lock_status',
          accepted: false,
          requestSequence: 4,
          reason: 'wrong_phase',
          serverTimeMs: 1_000,
        },
      }).textContent,
    ).toContain('Lock rejected');
  });
});
