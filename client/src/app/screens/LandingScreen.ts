import {
  GAMEPLAY_CONFIG,
  displayNameSchema,
  roomCodeSchema,
  type GameMode,
} from '@invisi-fight/shared';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { roomClient } from '../../network/colyseusClient.js';
import { serverAvailability } from '../../network/ServerAvailabilityService.js';
import { sessionStore } from '../../state/sessionStore.js';
import { uiStore } from '../../state/uiStore.js';
import { showControls } from '../ControlsDialog.js';
import { openSettings } from '../SettingsDialog.js';
import { readInvite } from '../invites.js';
import { disposeWhenDetached } from './disposeWhenDetached.js';

const launchIntent = readInvite(window.location.search);

export function LandingScreen(): HTMLElement {
  delete document.documentElement.dataset.recapSeen;
  const screen = document.createElement('main');
  screen.className = 'screen screen--landing';
  const backdrop = document.createElement('div');
  backdrop.className = 'landing-attract';
  backdrop.setAttribute('aria-hidden', 'true');
  const title = document.createElement('h1');
  title.className = 'screen__title';
  title.id = 'screen-title';
  title.textContent = 'INVISI FIGHT';
  let playerName = sessionStore.getState().playerName;
  let roomCode = launchIntent.roomCode;
  let mode: GameMode = launchIntent.mode;
  const form = document.createElement('form');
  form.className = 'landing-entry';
  const modeLabel = document.createElement('fieldset');
  modeLabel.className = 'landing-mode';
  const legend = document.createElement('legend');
  legend.textContent = 'Game mode';
  modeLabel.append(legend);
  const modeButtons: HTMLButtonElement[] = [];
  for (const [value, text] of [
    ['echo_hunt', 'Echo Hunt'],
    ['classic', 'Classic'],
  ] as const) {
    const button = Button({
      label: text,
      onClick: () => {
        mode = value;
        for (const entry of modeButtons)
          entry.setAttribute('aria-pressed', String(entry.dataset.mode === mode));
      },
    });
    button.classList.add('landing-mode__button');
    button.dataset.mode = value;
    button.setAttribute('aria-label', text);
    button.setAttribute('aria-pressed', String(value === mode));
    modeButtons.push(button);
    modeLabel.append(button);
  }
  form.append(
    Input({
      label: 'Fighter name',
      name: 'playerName',
      value: playerName,
      placeholder: 'Your name',
      maxLength: GAMEPLAY_CONFIG.maxDisplayNameLength,
      autoComplete: 'nickname',
      onInput: (value) => {
        playerName = value;
      },
    }),
    modeLabel,
    Button({ label: 'Create room', variant: 'primary', type: 'submit' }),
  );
  const submit = (operation: 'create' | 'join') => {
    const name = displayNameSchema.safeParse(playerName);
    const code = roomCodeSchema.safeParse(roomCode.trim().toUpperCase());
    if (!name.success) {
      uiStore.getState().setError('Enter a fighter name (1–20 characters).');
      return;
    }
    if (operation === 'join' && !code.success) {
      uiStore.getState().setError('Enter the 6-character room code.');
      return;
    }
    sessionStore.getState().setPlayerName(name.data);
    const selectedMode = mode;
    showControls(selectedMode, () => {
      void (
        operation === 'create'
          ? roomClient.createRoom(name.data, selectedMode)
          : roomClient.joinRoom(name.data, code.success ? code.data : '', selectedMode)
      ).catch(() => undefined);
    });
  };
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    submit('create');
  });
  const join = document.createElement('form');
  join.className = 'landing-join';
  join.append(
    Input({
      label: 'Room code',
      name: 'roomCode',
      value: roomCode,
      placeholder: 'ABC234',
      maxLength: GAMEPLAY_CONFIG.roomCodeLength,
      autoCapitalize: 'characters',
      spellCheck: false,
      uppercase: true,
      onInput: (value) => {
        roomCode = value;
      },
    }),
    Button({ label: 'Join room', type: 'submit' }),
  );
  join.addEventListener('submit', (event) => {
    event.preventDefault();
    submit('join');
  });
  const error = document.createElement('p');
  error.className = 'landing-error';
  error.setAttribute('role', 'alert');
  const availability = document.createElement('p');
  availability.className = 'landing-availability';
  availability.setAttribute('role', 'status');
  const unsubscribe = serverAvailability.subscribe((status) => {
    availability.textContent =
      status === 'ready'
        ? 'Server reachable'
        : status === 'checking'
          ? 'Checking server availability…'
          : status === 'unavailable'
            ? 'Availability check inconclusive. You can still try to connect.'
            : '';
  });
  screen.append(
    backdrop,
    title,
    form,
    join,
    Button({ label: 'Settings', onClick: openSettings }),
    availability,
    error,
  );
  let disposed = false;
  let attract: { destroy: () => void } | null = null;
  queueMicrotask(() => {
    void import('../../game-three/LandingAttract.js')
      .then(({ LandingAttract }) => {
        if (!disposed && screen.isConnected) attract = new LandingAttract(backdrop);
      })
      .catch(() => {
        /* The essential form remains usable without WebGL. */
      });
  });
  disposeWhenDetached(screen, () => {
    disposed = true;
    unsubscribe();
    attract?.destroy();
  });
  return screen;
}
