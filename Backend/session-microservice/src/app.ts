import Fastify from 'fastify';
import fp from 'fastify-plugin';

import { configPlugin } from './plugins/config';
import { dbPlugin } from './plugins/db';
import { swaggerPlugin } from './plugins/swagger';

import sessionsRoutes from './routes/sessions.routes';

export async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  await app.register(configPlugin);

  await app.register(dbPlugin);

  await app.register(swaggerPlugin);

  await app.register(sessionsRoutes, { prefix: '/sessions' });

  app.get('/health', async () => ({ status: 'ok' }));

  return app;
}