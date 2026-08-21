import type { AppScreen } from '../state/uiStore.js';

const ROUTE_BY_SCREEN: Record<AppScreen, string> = {
  landing: '/',
  connecting: '/connecting',
  lobby: '/room',
  match: '/room/match',
  spectator: '/room/spectate',
  results: '/room/results',
};

export class Router {
  navigate(screen: AppScreen, roomCode?: string): void {
    const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
    let route = ROUTE_BY_SCREEN[screen];
    if (roomCode && route.startsWith('/room')) route = route.replace('/room', `/room/${roomCode}`);
    const nextUrl = `${basePath}${route}` || '/';
    if (window.location.pathname !== nextUrl) window.history.replaceState({ screen }, '', nextUrl);
  }
}
