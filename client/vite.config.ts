import { defineConfig, loadEnv } from 'vite';
import { copyFileSync } from 'node:fs';
import { resolve } from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const repoName = env.VITE_GITHUB_PAGES_REPO_NAME ?? 'Invisi_Fight';
  const base = mode === 'production' ? `/${repoName}/` : '/';

  return {
    base: env.VITE_PUBLIC_BASE_PATH || base,
    build: {
      outDir: 'dist',
      sourcemap: true,
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks: {
            phaser: ['phaser'],
            three: ['three'],
            multiplayer: ['colyseus.js'],
          },
        },
      },
    },
    plugins: [
      {
        name: 'github-pages-spa-fallback',
        closeBundle() {
          copyFileSync(resolve('dist/index.html'), resolve('dist/404.html'));
        },
      },
    ],
  };
});
