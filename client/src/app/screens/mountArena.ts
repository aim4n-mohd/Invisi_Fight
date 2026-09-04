import { CLIENT_CONFIG } from '../../config/clientConfig.js';
import type { GameMode } from '@invisi-fight/shared';

async function createArena(
  gameFrame: HTMLElement,
  mode: GameMode,
): Promise<{ destroy: () => void }> {
  gameFrame.replaceChildren();
  if (mode === 'echo_hunt' && CLIENT_CONFIG.arenaRenderer === 'phaser' && import.meta.env.DEV) {
    console.info(
      'Echo Hunt uses Three.js; the Phaser engineering fallback applies only to Classic.',
    );
  }
  if (mode === 'classic' && CLIENT_CONFIG.arenaRenderer === 'phaser') {
    const { PhaserGame } = await import('../../game/PhaserGame.js');
    return new PhaserGame(gameFrame);
  }
  const { ThreeGame } = await import('../../game-three/ThreeGame.js');
  return new ThreeGame(gameFrame);
}

export function mountArena(gameFrame: HTMLElement, mode: GameMode = 'classic'): () => void {
  gameFrame.className = `game-frame game-frame--${mode === 'echo_hunt' ? 'three' : CLIENT_CONFIG.arenaRenderer}`;
  gameFrame.setAttribute('aria-label', 'Game arena');
  gameFrame.setAttribute('aria-busy', 'true');
  gameFrame.textContent = 'Loading arena…';
  let disposed = false;
  let game: { destroy: () => void } | null = null;

  void createArena(gameFrame, mode)
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
