import { GAMEPLAY_CONFIG, displayNameSchema, roomCodeSchema } from '@invisi-fight/shared';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { roomClient } from '../../network/colyseusClient.js';
import { sessionStore } from '../../state/sessionStore.js';
import { uiStore } from '../../state/uiStore.js';
import { screenFrame } from './screenFrame.js';

export function LandingScreen(): HTMLElement {
  delete document.documentElement.dataset.recapSeen;
  const screen = screenFrame(
    'Online tactical duel',
    'INVISI FIGHT',
    'Move unseen. Ping to reveal your rival, then aim and fire.',
  );
  screen.classList.add('screen--landing');
  let playerName = sessionStore.getState().playerName;
  let roomCode = '';

  const consolePanel = document.createElement('section');
  consolePanel.className = 'landing-console';
  consolePanel.setAttribute('aria-label', 'Enter a private room');

  const createPanel = document.createElement('form');
  createPanel.className = 'landing-console__create';
  createPanel.append(
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
    Button({ label: 'Create room', variant: 'primary', type: 'submit' }),
  );
  createPanel.addEventListener('submit', (event) => {
    event.preventDefault();
    const parsed = displayNameSchema.safeParse(playerName);
    if (!parsed.success) {
      uiStore.getState().setError('Please enter a display name with 1 to 20 visible characters.');
      return;
    }
    sessionStore.getState().setPlayerName(parsed.data);
    void roomClient.createRoom(parsed.data).catch(() => undefined);
  });

  const joinPanel = document.createElement('form');
  joinPanel.className = 'landing-console__join';
  joinPanel.append(
    Input({
      label: 'Room code',
      name: 'roomCode',
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
  joinPanel.addEventListener('submit', (event) => {
    event.preventDefault();
    const parsedName = displayNameSchema.safeParse(playerName);
    const parsedCode = roomCodeSchema.safeParse(roomCode);
    if (!parsedName.success) {
      uiStore.getState().setError('Please enter your display name before joining.');
      return;
    }
    if (!parsedCode.success) {
      uiStore.getState().setError('Please enter the 6-character room code.');
      return;
    }
    sessionStore.getState().setPlayerName(parsedName.data);
    void roomClient.joinRoom(parsedName.data, parsedCode.data).catch(() => undefined);
  });

  const divider = document.createElement('div');
  divider.className = 'landing-console__divider';
  divider.textContent = 'or join a room';
  consolePanel.append(createPanel, divider, joinPanel);
  screen.append(consolePanel);
  return screen;
}
