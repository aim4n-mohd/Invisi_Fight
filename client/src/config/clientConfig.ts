import { z } from 'zod';

const clientEnvironmentSchema = z.object({
  serverHttpUrl: z.string().url(),
  serverWsUrl: z.string().url(),
  buildEnvironment: z.enum(['development', 'staging', 'production']),
  buildCommitSha: z.string(),
  debugOverlay: z.boolean(),
  audioEnabled: z.boolean(),
  arenaRenderer: z.enum(['three', 'phaser']),
});

function booleanValue(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value === 'true';
}

function nonEmpty(value: string | undefined, fallback: string): string {
  return value?.trim() ? value.trim() : fallback;
}

const buildEnvironment = import.meta.env.VITE_BUILD_ENV ?? 'development';
const productionServerHttpUrl = 'https://invisi-fight-server.onrender.com';
const productionServerWsUrl = 'wss://invisi-fight-server.onrender.com';
const isProduction = buildEnvironment === 'production';

export const CLIENT_CONFIG = clientEnvironmentSchema.parse({
  serverHttpUrl: nonEmpty(
    import.meta.env.VITE_SERVER_HTTP_URL,
    isProduction ? productionServerHttpUrl : 'http://127.0.0.1:2567',
  ),
  serverWsUrl: nonEmpty(
    import.meta.env.VITE_SERVER_WS_URL,
    isProduction ? productionServerWsUrl : 'ws://127.0.0.1:2567',
  ),
  buildEnvironment,
  buildCommitSha: import.meta.env.VITE_BUILD_COMMIT_SHA ?? 'local-dev',
  debugOverlay: booleanValue(import.meta.env.VITE_ENABLE_DEBUG_OVERLAY, true),
  audioEnabled: booleanValue(import.meta.env.VITE_ENABLE_AUDIO, true),
  arenaRenderer: import.meta.env.VITE_ARENA_RENDERER ?? 'three',
});
