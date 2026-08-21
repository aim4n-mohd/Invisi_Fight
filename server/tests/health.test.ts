import { createServer } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { createHttpApp } from '../src/app.js';
import { readEnvironment } from '../src/config/env.js';

const servers: ReturnType<typeof createServer>[] = [];

afterEach(async () => {
  await Promise.all(
    servers
      .splice(0)
      .map((server) => new Promise<void>((resolve) => server.close(() => resolve()))),
  );
});

describe('server health endpoint', () => {
  it('should report a lightweight healthy response', async () => {
    const environment = readEnvironment({ NODE_ENV: 'test' });
    const server = createServer(createHttpApp(environment));
    servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Expected an assigned TCP port.');

    const response = await fetch(`http://127.0.0.1:${address.port}/healthz`);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, service: 'invisi-fight-server' });
  });

  it('allows both local Vite loopback origins outside production', async () => {
    const environment = readEnvironment({ NODE_ENV: 'development' });
    const server = createServer(createHttpApp(environment));
    servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Expected an assigned TCP port.');

    for (const origin of ['http://127.0.0.1:4173', 'http://localhost:4173']) {
      const response = await fetch(`http://127.0.0.1:${address.port}/healthz`, {
        headers: { Origin: origin },
      });
      expect(response.headers.get('access-control-allow-origin')).toBe(origin);
    }
  });
});
