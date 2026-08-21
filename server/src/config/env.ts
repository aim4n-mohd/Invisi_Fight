import { z } from 'zod';

const booleanFromString = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

const environmentSchema = z.object({
  PORT: z.coerce.number().int().positive().default(2567),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  SERVER_HOST: z.string().default('0.0.0.0'),
  SERVER_PUBLIC_URL: z.string().url().default('http://127.0.0.1:2567'),
  CLIENT_PUBLIC_URL: z.string().url().default('http://127.0.0.1:4173'),
  CORS_ORIGIN: z.string().default('http://127.0.0.1:4173'),
  MATCH_RECONNECT_GRACE_MS: z.coerce.number().int().positive().default(15_000),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  ENABLE_DEV_MODE: booleanFromString,
});

export type ServerEnvironment = z.infer<typeof environmentSchema>;

export function readEnvironment(source: NodeJS.ProcessEnv = process.env): ServerEnvironment {
  return environmentSchema.parse(source);
}
