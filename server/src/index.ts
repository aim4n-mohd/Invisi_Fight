import { assembleServer } from './app.js';
import { readEnvironment } from './config/env.js';

const environment = readEnvironment();
const { gameServer } = assembleServer(environment);

await gameServer.listen(environment.PORT, environment.SERVER_HOST);
console.info(
  JSON.stringify({
    timestamp: new Date().toISOString(),
    eventName: 'server_started',
    port: environment.PORT,
    host: environment.SERVER_HOST,
  }),
);
