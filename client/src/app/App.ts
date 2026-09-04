import { connectionStore } from '../state/connectionStore.js';
import { sessionStore } from '../state/sessionStore.js';
import { uiStore, type AppScreen } from '../state/uiStore.js';
import { Router } from './Router.js';
import { ConnectingScreen } from './screens/ConnectingScreen.js';
import { LandingScreen } from './screens/LandingScreen.js';
import { LobbyScreen } from './screens/LobbyScreen.js';
import { MatchScreen } from './screens/MatchScreen.js';
import { ResultsScreen } from './screens/ResultsScreen.js';
import { SpectatorScreen } from './screens/SpectatorScreen.js';
import { StatusBanner } from '../components/hud/StatusBanner.js';
import { EchoArenaScreen } from './screens/EchoArenaScreen.js';
import { serverAvailability } from '../network/ServerAvailabilityService.js';
import { openSettings } from './SettingsDialog.js';
import { Button } from '../components/ui/Button.js';

const SCREEN_FACTORY: Record<AppScreen, () => HTMLElement> = {
  landing: LandingScreen,
  connecting: ConnectingScreen,
  lobby: LobbyScreen,
  match: MatchScreen,
  spectator: SpectatorScreen,
  results: ResultsScreen,
};

export class App {
  readonly #router = new Router();
  readonly #unsubscribes: Array<() => void>;
  #currentScreen: AppScreen | null = null;
  #echoRoomId: string | null = null;

  constructor(readonly root: HTMLElement) {
    let roomSession = sessionStore.getState().roomSession;
    this.#unsubscribes = [
      uiStore.subscribe(() => this.render()),
      sessionStore.subscribe((state) => {
        if (state.roomSession === roomSession) return;
        roomSession = state.roomSession;
        this.render();
      }),
    ];
    this.render();
  }

  render(): void {
    const ui = uiStore.getState();
    const connection = connectionStore.getState();
    if (ui.screen === 'landing') serverAvailability.start();
    else serverAvailability.stop();
    if (ui.screen === 'landing' && this.#currentScreen === 'landing') {
      const error = this.root.querySelector<HTMLElement>('.landing-error');
      if (error) {
        error.textContent = ui.errorMessage ?? '';
        return;
      }
    }
    const roomCode = sessionStore.getState().roomSession?.roomCode;
    const session = sessionStore.getState().roomSession;
    const echoRoomId =
      session?.mode === 'echo_hunt' && ui.screen !== 'landing' ? session.roomId : null;
    if (echoRoomId) {
      this.#router.navigate('match', roomCode);
      if (this.#echoRoomId === echoRoomId) return;
      this.#echoRoomId = echoRoomId;
      this.#currentScreen = ui.screen;
      this.root.replaceChildren(EchoArenaScreen());
      return;
    }
    this.#echoRoomId = null;
    const screenChanged = this.#currentScreen !== ui.screen;
    const headingHadFocus = this.root.querySelector('#screen-title') === document.activeElement;
    this.#currentScreen = ui.screen;
    this.#router.navigate(ui.screen, roomCode);
    const shell = document.createElement('div');
    shell.className = 'app-shell';
    if (ui.screen === 'match' || ui.screen === 'spectator') {
      shell.classList.add('app-shell--game');
    }
    const screen = SCREEN_FACTORY[ui.screen]();
    if (ui.screen !== 'landing' && ui.screen !== 'connecting')
      screen.append(Button({ label: 'Settings', onClick: openSettings }));
    if (ui.screen === 'landing') {
      const error = screen.querySelector<HTMLElement>('.landing-error');
      if (error) error.textContent = ui.errorMessage ?? '';
    } else {
      if (ui.statusMessage) screen.append(StatusBanner(ui.statusMessage));
      if (ui.errorMessage) screen.append(StatusBanner(ui.errorMessage, 'error'));
    }
    screen.dataset.connectionStatus = connection.status;
    shell.append(screen);
    this.root.replaceChildren(shell);
    if (screenChanged || headingHadFocus) {
      const heading = screen.querySelector<HTMLElement>('h1');
      if (heading) {
        heading.tabIndex = -1;
        queueMicrotask(() => heading.focus({ preventScroll: true }));
      }
    }
  }

  destroy(): void {
    serverAvailability.stop();
    this.#unsubscribes.forEach((unsubscribe) => unsubscribe());
    this.root.replaceChildren();
  }
}
