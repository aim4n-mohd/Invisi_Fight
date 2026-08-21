import { GAMEPLAY_CONFIG, displayNameSchema, roomCodeSchema } from '@invisi-fight/shared';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { roomClient } from '../../network/colyseusClient.js';
import { sessionStore } from '../../state/sessionStore.js';
import { uiStore } from '../../state/uiStore.js';
import { screenFrame } from './screenFrame.js';

export function LandingScreen(): HTMLElement {
  const screen = screenFrame(
    'Private room multiplayer',
    'Move unseen. Scan carefully. Commit the shot.',
    'Create a room for friends or join with a code. During planning, only your private sonar can expose an opponent.',
  );
  const panelGrid = document.createElement('div');
  panelGrid.className = 'landing-grid';
  let playerName = sessionStore.getState().playerName;
  let roomCode = '';

  const identityPanel = document.createElement('section');
  identityPanel.className = 'panel stack identity-panel';
  const identityTitle = document.createElement('h2');
  identityTitle.textContent = 'Choose your fighter name';
  identityPanel.append(
    identityTitle,
    Input({
      label: 'Display name',
      name: 'playerName',
      value: playerName,
      placeholder: 'Your name',
      maxLength: GAMEPLAY_CONFIG.maxDisplayNameLength,
      autoComplete: 'nickname',
      onInput: (value) => {
        playerName = value;
      },
    }),
  );

  const createPanel = document.createElement('form');
  createPanel.className = 'panel stack';
  const createTitle = document.createElement('h2');
  createTitle.textContent = 'Create a room';
  createPanel.append(
    createTitle,
    Object.assign(document.createElement('p'), {
      className: 'muted',
      textContent: 'Start a fresh private room and share its six-character code with friends.',
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
  joinPanel.className = 'panel stack';
  const joinTitle = document.createElement('h2');
  joinTitle.textContent = 'Join friends';
  joinPanel.append(
    joinTitle,
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

  panelGrid.append(createPanel, joinPanel);
  screen.append(identityPanel, panelGrid);
  return screen;
}
