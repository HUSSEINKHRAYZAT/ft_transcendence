import Fastify from 'fastify';
import https from 'https';
import fp from 'fastify-plugin';

import { configPlugin } from './plugins/config';
import { dbPlugin } from './plugins/db';
import { swaggerPlugin } from './plugins/swagger';

import sessionsRoutes from './routes/sessions.routes';

export async function buildApp(httpsOptions?: https.ServerOptions) {
  const app = Fastify({
    logger: true,
    ...(httpsOptions && { https: httpsOptions })
  });

  await app.register(configPlugin);

  await app.register(dbPlugin);

  await app.register(swaggerPlugin);

  await app.register(sessionsRoutes, { prefix: '/sessions' });

  app.get('/health', async () => ({ status: 'ok' }));

  return app;
}