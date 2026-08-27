import { CLIENT_CONFIG } from '../../config/clientConfig.js';

async function createArena(gameFrame: HTMLElement): Promise<{ destroy: () => void }> {
  gameFrame.replaceChildren();
  if (CLIENT_CONFIG.arenaRenderer === 'phaser') {
    const { PhaserGame } = await import('../../game/PhaserGame.js');
    return new PhaserGame(gameFrame);
  }
  const { ThreeGame } = await import('../../game-three/ThreeGame.js');
  return new ThreeGame(gameFrame);
}

export function mountArena(gameFrame: HTMLElement): () => void {
  gameFrame.className = `game-frame game-frame--${CLIENT_CONFIG.arenaRenderer}`;
  gameFrame.setAttribute('aria-label', 'Game arena');
  gameFrame.setAttribute('aria-busy', 'true');
  gameFrame.textContent = 'Loading arena…';
  let disposed = false;
  let game: { destroy: () => void } | null = null;

  void createArena(gameFrame)
    .then((arena) => {
      if (disposed) {
        arena.destroy();
        return;
      }
      gameFrame.setAttribute('aria-busy', 'false');
      game = arena;
    })
    .catch(() => {
      if (disposed) return;
      gameFrame.setAttribute('aria-busy', 'false');
      gameFrame.textContent = 'The arena could not load. Refresh to try again.';
    });

  return () => {
    disposed = true;
    game?.destroy();
  };
}
