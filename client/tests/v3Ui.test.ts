import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseSettings, settingsStore, SETTINGS_KEY } from '../src/state/settingsStore.js';
import { readInvite, inviteUrl } from '../src/app/invites.js';
import { showControls } from '../src/app/ControlsDialog.js';
import { App } from '../src/app/App.js';
import { sessionStore } from '../src/state/sessionStore.js';
import { uiStore } from '../src/state/uiStore.js';
import { matchViewStore } from '../src/state/matchViewStore.js';
import { connectionStore } from '../src/state/connectionStore.js';

vi.mock('../src/game-three/LandingAttract.js', () => ({
  LandingAttract: class {
    destroy() {}
  },
}));
vi.mock('../src/app/screens/mountArena.js', () => ({
  mountArena: (parent: HTMLElement) => {
    parent.append(document.createElement('canvas'));
    return vi.fn();
  },
}));
vi.mock('../src/network/ServerAvailabilityService.js', () => ({
  serverAvailability: { start: vi.fn(), stop: vi.fn(), subscribe: () => vi.fn() },
}));

describe('V3 UI contracts', () => {
  beforeEach(() => {
    HTMLDialogElement.prototype.showModal = function () {
      this.open = true;
    };
    HTMLDialogElement.prototype.close = function () {
      this.open = false;
      this.dispatchEvent(new Event('close'));
    };
  });
  afterEach(() => {
    document.body.replaceChildren();
    sessionStore.getState().clearRoomSession();
    matchViewStore.getState().reset();
    connectionStore.getState().setStatus('idle');
    uiStore.getState().setScreen('landing');
  });
  it('sanitizes versioned settings and persists each level', () => {
    expect(parseSettings('{broken')).toEqual(parseSettings(null));
    expect(parseSettings('{"version":1,"master":3,"music":-1,"sfx":"bad"}')).toEqual({
      master: 1,
      music: 0,
      sfx: 0.85,
    });
    settingsStore.getState().setVolume('master', 0.3);
    expect(JSON.parse(localStorage.getItem(SETTINGS_KEY)!)).toMatchObject({
      version: 1,
      master: 0.3,
    });
  });
  it('round trips mode-aware invites without bypassing form validation', () => {
    const url = new URL(inviteUrl('ABC234', 'classic'));
    expect(readInvite(url.search)).toEqual({ roomCode: 'ABC234', mode: 'classic' });
    expect(readInvite('?room=bad&mode=invalid')).toEqual({ roomCode: '', mode: 'echo_hunt' });
  });
  it('stages entry until X and lets Back cancel', () => {
    HTMLDialogElement.prototype.showModal = function () {
      this.open = true;
    };
    HTMLDialogElement.prototype.close = function () {
      this.open = false;
      this.dispatchEvent(new Event('close'));
    };
    const enter = vi.fn();
    showControls('echo_hunt', enter);
    expect(enter).not.toHaveBeenCalled();
    const close = document.querySelector<HTMLButtonElement>(
      '[aria-label="Close controls and enter arena"]',
    )!;
    close.click();
    close.click();
    expect(enter).toHaveBeenCalledTimes(1);
    showControls('classic', enter);
    expect(document.querySelector('dialog')?.textContent).toContain('host starts');
    [...document.querySelectorAll('button')]
      .find((button) => button.textContent === 'Back')!
      .click();
    expect(enter).toHaveBeenCalledTimes(1);
    expect(document.querySelector('dialog')).toBeNull();
  });
  it('retains the Echo canvas through phases, results, reconnect and session refresh', async () => {
    connectionStore.getState().setStatus('connected');
    sessionStore.getState().setRoomSession({
      playerId: 'p',
      roomId: 'room',
      roomCode: 'ABC234',
      sessionToken: 'token',
      reconnectToken: 'reconnect',
      mode: 'echo_hunt',
    });
    uiStore.getState().setScreen('match');
    const root = document.createElement('div');
    document.body.append(root);
    const app = new App(root);
    const canvas = root.querySelector('canvas');
    expect(canvas).not.toBeNull();
    matchViewStore.setState({ phase: 'results' });
    await Promise.resolve();
    const results = root.querySelector<HTMLDialogElement>('.echo-results')!;
    expect(results.open).toBe(true);
    expect(results.getAttribute('aria-modal')).toBe('true');
    const readyButton = [...root.querySelectorAll('button')].find(
      (button) => button.textContent === 'Join next match',
    )!;
    const readyLabel = readyButton.firstChild;
    matchViewStore.setState({ revision: 123 });
    expect(readyButton.firstChild).toBe(readyLabel);
    expect(document.activeElement).toBe(readyButton);
    results.close();
    expect(results.hasAttribute('aria-modal')).toBe(false);
    matchViewStore.setState({ revision: 124 });
    expect(results.open).toBe(false);
    [...root.querySelectorAll('button')]
      .find((button) => button.textContent === 'Match results')!
      .click();
    expect(results.open).toBe(true);
    for (const phase of ['countdown', 'echo_hunt', 'final_echo', 'results', 'countdown'] as const) {
      matchViewStore.setState({ phase });
      uiStore.getState().setError('Transient status');
      expect(root.querySelector('canvas')).toBe(canvas);
      if (phase === 'echo_hunt' || phase === 'final_echo') expect(results.open).toBe(false);
    }
    uiStore.getState().setScreen('connecting');
    sessionStore
      .getState()
      .setRoomSession({ ...sessionStore.getState().roomSession!, reconnectToken: 'new' });
    expect(root.querySelector('canvas')).toBe(canvas);
    app.destroy();
  });
});
