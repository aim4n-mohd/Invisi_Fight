import { createServer, type Server as HttpServer } from 'node:http';
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import cors from 'cors';
import express, { type Express } from 'express';
import { GAMEPLAY_CONFIG } from '@invisi-fight/shared';
import { InvisiFightRoom } from './rooms/InvisiFightRoom.js';
import type { ServerEnvironment } from './config/env.js';

const startedAtMs = Date.now();

export function createHttpApp(environment: ServerEnvironment): Express {
  const app = express();
  const allowedOrigins = new Set([environment.CORS_ORIGIN, environment.CLIENT_PUBLIC_URL]);
  if (environment.NODE_ENV !== 'production') {
    allowedOrigins.add('http://127.0.0.1:4173');
    allowedOrigins.add('http://localhost:4173');
  }
  app.disable('x-powered-by');
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin)) callback(null, true);
        else callback(new Error('Origin is not allowed.'));
      },
    }),
  );
  app.use(express.json({ limit: '16kb' }));
  app.get('/healthz', (_request, response) => {
    response.status(200).json({
      ok: true,
      service: 'invisi-fight-server',
      uptimeMs: Date.now() - startedAtMs,
      buildSha: process.env.RENDER_GIT_COMMIT ?? process.env.GITHUB_SHA ?? 'local-dev',
    });
  });
  app.get('/api/v1/config', (_request, response) => {
    response.status(200).json({
      protocolVersion: GAMEPLAY_CONFIG.protocolVersion,
      roomName: 'invisi_fight',
      serverTimeMs: Date.now(),
    });
  });
  return app;
}

export function createGameServer(httpServer: HttpServer, environment: ServerEnvironment): Server {
  const gameServer = new Server({
    transport: new WebSocketTransport({ server: httpServer }),
    devMode: environment.ENABLE_DEV_MODE,
    greet: environment.NODE_ENV !== 'test',
  });
  gameServer
    .define('invisi_fight', InvisiFightRoom, {
      reconnectGraceMs: environment.MATCH_RECONNECT_GRACE_MS,
    })
    .filterBy(['roomCode', 'mode']);
  return gameServer;
}

export function assembleServer(environment: ServerEnvironment): {
  httpServer: HttpServer;
  gameServer: Server;
} {
  const httpServer = createServer(createHttpApp(environment));
  const gameServer = createGameServer(httpServer, environment);
  return { httpServer, gameServer };
}
