import { Button } from '../../components/ui/Button.js';
import { roomClient } from '../../network/colyseusClient.js';
import { sessionStore } from '../../state/sessionStore.js';
import { screenFrame } from './screenFrame.js';

export function ConnectingScreen(): HTMLElement {
  const token = sessionStore.getState().roomSession?.reconnectToken;
  const screen = screenFrame(
    'Connection status',
    'Connecting to your room',
    'Opening the multiplayer connection. A sleeping server may take a moment to start.',
  );
  const panel = document.createElement('div');
  panel.className = 'panel cluster';
  panel.append(
    Button({
      label: 'Retry now',
      variant: 'primary',
      disabled: !token,
      onClick: () => {
        if (token) void roomClient.reconnect(token).catch(() => undefined);
      },
    }),
    Button({ label: 'Return to landing', onClick: () => void roomClient.leave() }),
  );
  screen.append(panel);
  return screen;
}
