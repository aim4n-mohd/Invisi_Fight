import './styles/global.css';
import { App } from './app/App.js';
import { roomClient } from './network/colyseusClient.js';
import { sessionStore } from './state/sessionStore.js';

const appRoot = document.querySelector<HTMLElement>('#app');

if (!appRoot) {
  throw new Error('App mount point was not found.');
}

new App(appRoot);

window.addEventListener('pagehide', () => roomClient.prepareForPageClose());
window.addEventListener('beforeunload', () => roomClient.prepareForPageClose());

const existingSession = sessionStore.getState().roomSession;
if (existingSession?.reconnectToken) {
  void roomClient.reconnect(existingSession.reconnectToken).catch(() => undefined);
}
