export function mountArena(gameFrame: HTMLElement): () => void {
  gameFrame.className = 'game-frame';
  gameFrame.setAttribute('aria-label', 'Game arena');
  gameFrame.setAttribute('aria-busy', 'true');
  gameFrame.textContent = 'Loading arena…';
  let disposed = false;
  let game: { destroy: () => void } | null = null;

  void import('../../game/PhaserGame.js')
    .then(({ PhaserGame }) => {
      if (disposed) return;
      gameFrame.replaceChildren();
      gameFrame.setAttribute('aria-busy', 'false');
      game = new PhaserGame(gameFrame);
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
