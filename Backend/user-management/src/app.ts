import Fastify from 'fastify';
import fp from 'fastify-plugin';

import { configPlugin } from './plugins/config';
import { dbPlugin } from './plugins/db';
import { swaggerPlugin } from './plugins/swagger';

import usersRoutes from './routes/users.routes';
import statisticsRoutes from './routes/statistics.routes';

import relationRoutes from './routes/relation.routes';
import relationTypeRoutes from './routes/relation_type.routes';

export async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  await app.register(configPlugin);

  await app.register(dbPlugin);

  await app.register(swaggerPlugin);

  await app.register(usersRoutes, { prefix: '/users' });
  await app.register(statisticsRoutes, { prefix: '/statistics' });
  await app.register(relationRoutes, { prefix: '/relation' });
  await app.register(relationTypeRoutes, { prefix: '/relationType' });

  app.get('/health', async () => ({ status: 'ok' }));

  return app;
}